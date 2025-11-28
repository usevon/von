import { Worker, Job } from "bullmq"
import { eq } from "drizzle-orm"
import { createHmac } from "crypto"
import { db } from "@von/db"
import { inboundDelivery, inboundEndpoint } from "@von/db/schema"
import { createConnection, type InboundForwardingJob } from "@von/queue"
import { createLogger } from "@von/logger/elysia"
import { env } from "@/env"

const log = createLogger({
  level: env.NODE_ENV === "development" ? "debug" : "info",
  pretty: env.NODE_ENV === "development",
})

const generateSignature = (payload: string, secret: string): string => {
  const hmac = createHmac("sha256", secret)
  hmac.update(payload)
  return hmac.digest("hex")
}

const CIRCUIT_CONFIG = {
  failureThreshold: 5,
  resetTimeoutMs: 300000,
}

const processInboundForwarding = async (job: Job<InboundForwardingJob>) => {
  const { deliveryId, endpoint: ep, payload, headers } = job.data

  // Parallel fetch: delivery status (idempotency) + endpoint state (circuit breaker)
  const [[deliveryRecord], [endpointState]] = await Promise.all([
    db.select().from(inboundDelivery).where(eq(inboundDelivery.id, deliveryId)).limit(1),
    db
      .select({
        enabled: inboundEndpoint.enabled,
        circuitState: inboundEndpoint.circuitState,
        circuitOpenedAt: inboundEndpoint.circuitOpenedAt,
        failureCount: inboundEndpoint.failureCount,
      })
      .from(inboundEndpoint)
      .where(eq(inboundEndpoint.id, ep.id))
      .limit(1),
  ])

  if (!deliveryRecord) {
    log.warn({ deliveryId }, "Inbound delivery not found, skipping")
    return
  }

  if (deliveryRecord.status === "forwarded") {
    log.info({ deliveryId }, "Already forwarded, skipping")
    return
  }

  if (!endpointState) {
    log.error({ endpointId: ep.id }, "Inbound endpoint not found")
    throw new Error(`Inbound endpoint ${ep.id} not found`)
  }

  if (!endpointState.enabled) {
    log.info({ endpointId: ep.id }, "Inbound endpoint disabled, marking as skipped")
    await db
      .update(inboundDelivery)
      .set({ status: "skipped" })
      .where(eq(inboundDelivery.id, deliveryId))
    return
  }

  if (endpointState.circuitState === "open") {
    const circuitOpenedAt = endpointState.circuitOpenedAt
    if (circuitOpenedAt) {
      const timeSinceOpen = Date.now() - circuitOpenedAt.getTime()
      if (timeSinceOpen < CIRCUIT_CONFIG.resetTimeoutMs) {
        log.info({ endpointId: ep.id }, "Circuit breaker open, marking as skipped")
        await db
          .update(inboundDelivery)
          .set({ status: "circuit_open" })
          .where(eq(inboundDelivery.id, deliveryId))
        return
      }
      await db
        .update(inboundEndpoint)
        .set({ circuitState: "half_open", updatedAt: new Date() })
        .where(eq(inboundEndpoint.id, ep.id))
    }
  }

  const originalHeaders: Record<string, string> = headers ? JSON.parse(headers) : {}
  const signature = generateSignature(payload, ep.secret)
  const now = new Date()

  try {
    const response = await fetch(ep.forwardUrl, {
      method: "POST",
      headers: {
        ...originalHeaders,
        "X-Von-Signature": signature,
        "X-Von-Inbound-Delivery-Id": deliveryId,
      },
      body: payload,
      signal: AbortSignal.timeout(ep.timeoutMs),
    })

    const responseBody = await response.text().catch(() => null)

    if (response.ok) {
      // Parallel: update delivery + reset circuit breaker
      await Promise.all([
        db
          .update(inboundDelivery)
          .set({
            status: "forwarded",
            attempts: deliveryRecord.attempts + 1,
            lastAttemptAt: now,
            forwardedAt: now,
            responseStatus: response.status,
            responseBody: responseBody?.slice(0, 1000) ?? null,
          })
          .where(eq(inboundDelivery.id, deliveryId)),
        db
          .update(inboundEndpoint)
          .set({
            failureCount: 0,
            circuitState: "closed",
            updatedAt: now,
          })
          .where(eq(inboundEndpoint.id, ep.id)),
      ])

      log.info(
        { deliveryId, status: response.status },
        "Inbound webhook forwarded successfully"
      )
    } else {
      throw new Error(`HTTP ${response.status}: ${responseBody?.slice(0, 200)}`)
    }
  } catch (error) {
    const attempts = deliveryRecord.attempts + 1
    const maxAttempts = ep.retryCount
    const isFinalAttempt = attempts >= maxAttempts

    const newFailureCount = endpointState.failureCount + 1
    const shouldOpenCircuit = newFailureCount >= CIRCUIT_CONFIG.failureThreshold

    // Parallel: update delivery + update endpoint failure state
    await Promise.all([
      db
        .update(inboundDelivery)
        .set({
          status: isFinalAttempt ? "failed" : "pending",
          attempts,
          lastAttemptAt: now,
        })
        .where(eq(inboundDelivery.id, deliveryId)),
      shouldOpenCircuit
        ? db
            .update(inboundEndpoint)
            .set({
              circuitState: "open",
              circuitOpenedAt: now,
              failureCount: newFailureCount,
              lastFailureAt: now,
              updatedAt: now,
            })
            .where(eq(inboundEndpoint.id, ep.id))
        : db
            .update(inboundEndpoint)
            .set({
              failureCount: newFailureCount,
              lastFailureAt: now,
              updatedAt: now,
            })
            .where(eq(inboundEndpoint.id, ep.id)),
    ])

    if (shouldOpenCircuit) {
      log.warn({ endpointId: ep.id, failureCount: newFailureCount }, "Circuit breaker opened")
    }

    log.error(
      { deliveryId, attempts, maxAttempts, error: String(error) },
      "Inbound forwarding failed"
    )

    if (!isFinalAttempt) {
      throw error
    }
  }
}

export const createInboundWorker = () => {
  const worker = new Worker<InboundForwardingJob>(
    "inbound-forwarding",
    processInboundForwarding,
    {
      connection: createConnection(),
      concurrency: 200,
    }
  )

  worker.on("completed", (job) => {
    log.debug({ jobId: job.id }, "Inbound job completed")
  })

  worker.on("failed", (job, error) => {
    log.error({ jobId: job?.id, error: error.message }, "Inbound job failed")
  })

  return worker
}
