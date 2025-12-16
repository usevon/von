import { Worker, Job } from "bullmq"
import { eq, sql } from "drizzle-orm"
import { db } from "@usevon/db"
import { inboundDelivery, inboundEndpoint } from "@usevon/db/schema"
import { createConnection, type InboundForwardingJob } from "@usevon/queue"
import { createLogger } from "@usevon/utils/logger"
import {
  hmacSign,
  isCircuitOpen,
  shouldTransitionToHalfOpen,
  getSuccessUpdate,
  getFailureUpdate,
  type CircuitState,
} from "@usevon/utils"
import { env } from "@/env"

const log = createLogger({
  level: env.NODE_ENV === "development" ? "debug" : "info",
  pretty: env.NODE_ENV === "development",
})

const getInboundDeliveryStmt = db
  .select()
  .from(inboundDelivery)
  .where(eq(inboundDelivery.id, sql.placeholder("id")))
  .limit(1)
  .prepare("worker_get_inbound_delivery")

const getInboundEndpointStateStmt = db
  .select({
    enabled: inboundEndpoint.enabled,
    circuitState: inboundEndpoint.circuitState,
    circuitOpenedAt: inboundEndpoint.circuitOpenedAt,
    failureCount: inboundEndpoint.failureCount,
  })
  .from(inboundEndpoint)
  .where(eq(inboundEndpoint.id, sql.placeholder("id")))
  .limit(1)
  .prepare("worker_get_inbound_endpoint_state")

const processInboundForwarding = async (job: Job<InboundForwardingJob>) => {
  const { deliveryId, endpoint: ep, payload, headers } = job.data

  const [[deliveryRecord], [endpointState]] = await Promise.all([
    getInboundDeliveryStmt.execute({ id: deliveryId }),
    getInboundEndpointStateStmt.execute({ id: ep.id }),
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

  const circuitState = {
    circuitState: endpointState.circuitState as CircuitState,
    circuitOpenedAt: endpointState.circuitOpenedAt,
    failureCount: endpointState.failureCount,
  }

  if (isCircuitOpen(circuitState)) {
    log.info({ endpointId: ep.id }, "Circuit breaker open, marking as skipped")
    await db
      .update(inboundDelivery)
      .set({ status: "circuit_open" })
      .where(eq(inboundDelivery.id, deliveryId))
    return
  }

  if (shouldTransitionToHalfOpen(circuitState)) {
    await db
      .update(inboundEndpoint)
      .set({ circuitState: "half_open", updatedAt: new Date() })
      .where(eq(inboundEndpoint.id, ep.id))
  }

  const originalHeaders: Record<string, string> = headers ? JSON.parse(headers) : {}
  const now = new Date()
  const timestamp = Math.floor(now.getTime() / 1000)
  const signedPayload = `${timestamp}.${payload}`
  const signature = hmacSign(signedPayload, ep.secret)

  try {
    const response = await fetch(ep.forwardUrl, {
      method: "POST",
      headers: {
        ...originalHeaders,
        "X-Von-Signature": `t=${timestamp},v1=${signature}`,
        "X-Von-Timestamp": String(timestamp),
        "X-Von-Inbound-Delivery-Id": deliveryId,
      },
      body: payload,
      signal: AbortSignal.timeout(ep.timeoutMs),
    })

    const responseBody = await response.text().catch(() => null)

    if (response.ok) {
      const successUpdate = getSuccessUpdate()

      await Promise.all([
        db
          .update(inboundDelivery)
          .set({
            status: "forwarded",
            attempts: deliveryRecord.attempts + 1,
            lastAttemptAt: now,
            forwardedAt: now,
            responseStatus: response.status,
            responseBody: responseBody?.slice(0, 200) ?? null,
          })
          .where(eq(inboundDelivery.id, deliveryId)),
        db
          .update(inboundEndpoint)
          .set({
            ...successUpdate,
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

    const failureUpdate = getFailureUpdate(endpointState.failureCount)

    await Promise.all([
      db
        .update(inboundDelivery)
        .set({
          status: isFinalAttempt ? "failed" : "pending",
          attempts,
          lastAttemptAt: now,
        })
        .where(eq(inboundDelivery.id, deliveryId)),
      db
        .update(inboundEndpoint)
        .set({
          circuitState: failureUpdate.circuitState,
          circuitOpenedAt: failureUpdate.shouldOpenCircuit ? now : undefined,
          failureCount: failureUpdate.failureCount,
          lastFailureAt: now,
          updatedAt: now,
        })
        .where(eq(inboundEndpoint.id, ep.id)),
    ])

    if (failureUpdate.shouldOpenCircuit) {
      log.warn({ endpointId: ep.id, failureCount: failureUpdate.failureCount }, "Circuit breaker opened")
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
      concurrency: env.WORKER_CONCURRENCY,
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
