import { Worker, Job } from "bullmq"
import { eq, and, sql } from "drizzle-orm"
import { db } from "@usevon/db"
import { delivery, endpoint, webhookVersion } from "@usevon/db/schema"
import { createConnection, type WebhookDeliveryJob } from "@usevon/queue"
import { createLogger } from "@usevon/utils/logger"
import {
  hmacSign,
  applyTransforms,
  isCircuitOpen,
  shouldTransitionToHalfOpen,
  getSuccessUpdate,
  getFailureUpdate,
  type Transforms,
  type CircuitState,
} from "@usevon/utils"
import { env } from "@/env"

const log = createLogger({
  level: env.NODE_ENV === "development" ? "debug" : "info",
  pretty: env.NODE_ENV === "development",
})

const getDeliveryStmt = db
  .select()
  .from(delivery)
  .where(eq(delivery.id, sql.placeholder("id")))
  .limit(1)
  .prepare("worker_get_delivery")

const getEndpointStateStmt = db
  .select({
    enabled: endpoint.enabled,
    circuitState: endpoint.circuitState,
    circuitOpenedAt: endpoint.circuitOpenedAt,
    failureCount: endpoint.failureCount,
  })
  .from(endpoint)
  .where(eq(endpoint.id, sql.placeholder("id")))
  .limit(1)
  .prepare("worker_get_endpoint_state")

const getVersionStmt = db
  .select({ transforms: webhookVersion.transforms })
  .from(webhookVersion)
  .where(
    and(
      eq(webhookVersion.version, sql.placeholder("version")),
      eq(webhookVersion.organizationId, sql.placeholder("orgId"))
    )
  )
  .limit(1)
  .prepare("worker_get_version")

type CachedVersion = {
  transforms: Transforms | null
  expiresAt: number
}

const versionCache = new Map<string, CachedVersion>()
const CACHE_TTL_MS = 60_000

const getVersionTransforms = async (
  version: string,
  organizationId: string
): Promise<Transforms | null> => {
  const cacheKey = `${organizationId}:${version}`
  const cached = versionCache.get(cacheKey)

  if (cached && cached.expiresAt > Date.now()) {
    return cached.transforms
  }

  const [result] = await getVersionStmt.execute({ version, orgId: organizationId })
  const transforms = (result?.transforms as Transforms) ?? null

  versionCache.set(cacheKey, {
    transforms,
    expiresAt: Date.now() + CACHE_TTL_MS,
  })

  return transforms
}

const processWebhookDelivery = async (job: Job<WebhookDeliveryJob>) => {
  const { deliveryId, eventId, payload, eventType, endpoint: ep, organizationId } = job.data

  const [[deliveryRecord], [endpointState]] = await Promise.all([
    getDeliveryStmt.execute({ id: deliveryId }),
    getEndpointStateStmt.execute({ id: ep.id }),
  ])

  if (!deliveryRecord) {
    log.warn({ deliveryId }, "Delivery not found, skipping")
    return
  }

  if (deliveryRecord.status === "delivered") {
    log.info({ deliveryId }, "Already delivered, skipping")
    return
  }

  if (!endpointState) {
    log.error({ endpointId: ep.id }, "Endpoint not found")
    throw new Error(`Endpoint ${ep.id} not found`)
  }

  if (!endpointState.enabled) {
    log.info({ endpointId: ep.id }, "Endpoint disabled, marking as skipped")
    await db
      .update(delivery)
      .set({ status: "skipped", updatedAt: new Date() })
      .where(eq(delivery.id, deliveryId))
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
      .update(delivery)
      .set({ status: "circuit_open", updatedAt: new Date() })
      .where(eq(delivery.id, deliveryId))
    return
  }

  if (shouldTransitionToHalfOpen(circuitState)) {
    await db
      .update(endpoint)
      .set({ circuitState: "half_open", updatedAt: new Date() })
      .where(eq(endpoint.id, ep.id))
  }

  let finalPayload = payload

  if (ep.version) {
    const transforms = await getVersionTransforms(ep.version, organizationId)

    if (transforms) {
      const eventTransforms = transforms[eventType]

      if (eventTransforms) {
        const parsed = JSON.parse(payload) as Record<string, unknown>
        const transformed = applyTransforms(parsed, eventTransforms)
        finalPayload = JSON.stringify(transformed)
        log.debug({ endpointId: ep.id, version: ep.version, eventType }, "Applied transforms")
      }
    }
  }

  const now = new Date()
  const timestamp = Math.floor(now.getTime() / 1000)
  const signedPayload = `${timestamp}.${finalPayload}`
  const signature = hmacSign(signedPayload, ep.secret)

  try {
    const response = await fetch(ep.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Von-Signature": `t=${timestamp},v1=${signature}`,
        "X-Von-Timestamp": String(timestamp),
        "X-Von-Event-Type": eventType,
        "X-Von-Delivery-Id": deliveryId,
        "X-Von-Event-Id": eventId,
      },
      body: finalPayload,
      signal: AbortSignal.timeout(ep.timeoutMs),
    })

    const responseBody = await response.text().catch(() => null)

    if (response.ok) {
      const successUpdate = getSuccessUpdate()

      await Promise.all([
        db
          .update(delivery)
          .set({
            status: "delivered",
            attempts: deliveryRecord.attempts + 1,
            lastAttemptAt: now,
            responseStatus: response.status,
            responseBody: responseBody?.slice(0, 1000) ?? null,
            updatedAt: now,
          })
          .where(eq(delivery.id, deliveryId)),
        db
          .update(endpoint)
          .set({
            ...successUpdate,
            updatedAt: now,
          })
          .where(eq(endpoint.id, ep.id)),
      ])

      log.info(
        { deliveryId, status: response.status },
        "Webhook delivered successfully"
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
        .update(delivery)
        .set({
          status: isFinalAttempt ? "failed" : "pending",
          attempts,
          lastAttemptAt: now,
          updatedAt: now,
        })
        .where(eq(delivery.id, deliveryId)),
      db
        .update(endpoint)
        .set({
          circuitState: failureUpdate.circuitState,
          circuitOpenedAt: failureUpdate.shouldOpenCircuit ? now : undefined,
          failureCount: failureUpdate.failureCount,
          lastFailureAt: now,
          updatedAt: now,
        })
        .where(eq(endpoint.id, ep.id)),
    ])

    if (failureUpdate.shouldOpenCircuit) {
      log.warn({ endpointId: ep.id, failureCount: failureUpdate.failureCount }, "Circuit breaker opened")
    }

    log.error(
      { deliveryId, attempts, maxAttempts, error: String(error) },
      "Webhook delivery failed"
    )

    if (!isFinalAttempt) {
      throw error
    }
  }
}

export const createWebhookWorker = () => {
  const worker = new Worker<WebhookDeliveryJob>(
    "webhook-delivery",
    processWebhookDelivery,
    {
      connection: createConnection(),
      concurrency: 200,
    }
  )

  worker.on("completed", (job) => {
    log.debug({ jobId: job.id }, "Job completed")
  })

  worker.on("failed", (job, error) => {
    log.error({ jobId: job?.id, error: error.message }, "Job failed")
  })

  return worker
}
