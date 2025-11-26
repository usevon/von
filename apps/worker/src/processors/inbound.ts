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
  const { deliveryId, endpointId } = job.data

  const [deliveryRecord] = await db
    .select()
    .from(inboundDelivery)
    .where(eq(inboundDelivery.id, deliveryId))
    .limit(1)

  if (!deliveryRecord) {
    log.warn({ deliveryId }, "Inbound delivery not found, skipping")
    return
  }

  if (deliveryRecord.status === "forwarded") {
    log.info({ deliveryId }, "Already forwarded, skipping")
    return
  }

  const [endpointRecord] = await db
    .select()
    .from(inboundEndpoint)
    .where(eq(inboundEndpoint.id, endpointId))
    .limit(1)

  if (!endpointRecord) {
    log.error({ endpointId }, "Inbound endpoint not found")
    throw new Error(`Inbound endpoint ${endpointId} not found`)
  }

  if (!endpointRecord.enabled) {
    log.info({ endpointId }, "Inbound endpoint disabled, marking as skipped")
    await db
      .update(inboundDelivery)
      .set({ status: "skipped" })
      .where(eq(inboundDelivery.id, deliveryId))
    return
  }

  if (endpointRecord.circuitState === "open") {
    const circuitOpenedAt = endpointRecord.circuitOpenedAt
    if (circuitOpenedAt) {
      const timeSinceOpen = Date.now() - circuitOpenedAt.getTime()
      if (timeSinceOpen < CIRCUIT_CONFIG.resetTimeoutMs) {
        log.info({ endpointId }, "Circuit breaker open, marking as skipped")
        await db
          .update(inboundDelivery)
          .set({ status: "circuit_open" })
          .where(eq(inboundDelivery.id, deliveryId))
        return
      }
      await db
        .update(inboundEndpoint)
        .set({ circuitState: "half_open", updatedAt: new Date() })
        .where(eq(inboundEndpoint.id, endpointId))
    }
  }

  const payload = deliveryRecord.payload
  const originalHeaders: Record<string, string> = deliveryRecord.headers
    ? JSON.parse(deliveryRecord.headers)
    : {}
  const signature = generateSignature(payload, endpointRecord.secret)
  const now = new Date()

  try {
    const response = await fetch(endpointRecord.forwardUrl, {
      method: "POST",
      headers: {
        ...originalHeaders,
        "X-Von-Signature": signature,
        "X-Von-Inbound-Delivery-Id": deliveryId,
      },
      body: payload,
      signal: AbortSignal.timeout(endpointRecord.timeoutMs),
    })

    const responseBody = await response.text().catch(() => null)

    if (response.ok) {
      await db
        .update(inboundDelivery)
        .set({
          status: "forwarded",
          attempts: deliveryRecord.attempts + 1,
          lastAttemptAt: now,
          forwardedAt: now,
          responseStatus: response.status,
          responseBody: responseBody?.slice(0, 1000) ?? null,
        })
        .where(eq(inboundDelivery.id, deliveryId))

      await db
        .update(inboundEndpoint)
        .set({
          failureCount: 0,
          circuitState: "closed",
          updatedAt: now,
        })
        .where(eq(inboundEndpoint.id, endpointId))

      log.info(
        { deliveryId, status: response.status },
        "Inbound webhook forwarded successfully"
      )
    } else {
      throw new Error(`HTTP ${response.status}: ${responseBody?.slice(0, 200)}`)
    }
  } catch (error) {
    const attempts = deliveryRecord.attempts + 1
    const maxAttempts = endpointRecord.retryCount
    const isFinalAttempt = attempts >= maxAttempts

    await db
      .update(inboundDelivery)
      .set({
        status: isFinalAttempt ? "failed" : "pending",
        attempts,
        lastAttemptAt: now,
      })
      .where(eq(inboundDelivery.id, deliveryId))

    const newFailureCount = endpointRecord.failureCount + 1
    if (newFailureCount >= CIRCUIT_CONFIG.failureThreshold) {
      await db
        .update(inboundEndpoint)
        .set({
          circuitState: "open",
          circuitOpenedAt: now,
          failureCount: newFailureCount,
          lastFailureAt: now,
          updatedAt: now,
        })
        .where(eq(inboundEndpoint.id, endpointId))
      log.warn({ endpointId, failureCount: newFailureCount }, "Circuit breaker opened")
    } else {
      await db
        .update(inboundEndpoint)
        .set({
          failureCount: newFailureCount,
          lastFailureAt: now,
          updatedAt: now,
        })
        .where(eq(inboundEndpoint.id, endpointId))
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
      concurrency: 10,
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
