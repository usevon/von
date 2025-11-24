import { Worker, Job } from "bullmq"
import { eq } from "drizzle-orm"
import { createHmac } from "crypto"
import { db } from "@von/db"
import { delivery, event, endpoint } from "@von/db/schema"
import { createConnection, type WebhookDeliveryJob } from "@von/queue"
import { createLogger } from "@von/logger/elysia"

const log = createLogger({ level: "info" })

const generateSignature = (payload: string, secret: string): string => {
  const hmac = createHmac("sha256", secret)
  hmac.update(payload)
  return hmac.digest("hex")
}

const processWebhookDelivery = async (job: Job<WebhookDeliveryJob>) => {
  const { deliveryId, eventId, endpointId } = job.data

  const [deliveryRecord] = await db
    .select()
    .from(delivery)
    .where(eq(delivery.id, deliveryId))
    .limit(1)

  if (!deliveryRecord) {
    log.warn({ deliveryId }, "Delivery not found, skipping")
    return
  }

  if (deliveryRecord.status === "delivered") {
    log.info({ deliveryId }, "Already delivered, skipping")
    return
  }

  const [eventRecord] = await db
    .select()
    .from(event)
    .where(eq(event.id, eventId))
    .limit(1)

  if (!eventRecord) {
    log.error({ eventId }, "Event not found")
    throw new Error(`Event ${eventId} not found`)
  }

  const [endpointRecord] = await db
    .select()
    .from(endpoint)
    .where(eq(endpoint.id, endpointId))
    .limit(1)

  if (!endpointRecord) {
    log.error({ endpointId }, "Endpoint not found")
    throw new Error(`Endpoint ${endpointId} not found`)
  }

  if (!endpointRecord.enabled) {
    log.info({ endpointId }, "Endpoint disabled, marking as skipped")
    await db
      .update(delivery)
      .set({ status: "skipped", updatedAt: new Date() })
      .where(eq(delivery.id, deliveryId))
    return
  }

  const payload = eventRecord.payload
  const signature = generateSignature(payload, endpointRecord.secret)
  const now = new Date()

  try {
    const controller = new AbortController()
    const timeout = setTimeout(
      () => controller.abort(),
      endpointRecord.timeoutMs
    )

    const response = await fetch(endpointRecord.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Von-Signature": signature,
        "X-Von-Event-Type": eventRecord.eventType,
        "X-Von-Delivery-Id": deliveryId,
        "X-Von-Event-Id": eventId,
      },
      body: payload,
      signal: controller.signal,
    })

    clearTimeout(timeout)

    const responseBody = await response.text().catch(() => null)

    if (response.ok) {
      await db
        .update(delivery)
        .set({
          status: "delivered",
          attempts: deliveryRecord.attempts + 1,
          lastAttemptAt: now,
          responseStatus: response.status,
          responseBody: responseBody?.slice(0, 1000) ?? null,
          updatedAt: now,
        })
        .where(eq(delivery.id, deliveryId))

      log.info(
        { deliveryId, status: response.status },
        "Webhook delivered successfully"
      )
    } else {
      throw new Error(`HTTP ${response.status}: ${responseBody?.slice(0, 200)}`)
    }
  } catch (error) {
    const attempts = deliveryRecord.attempts + 1
    const maxAttempts = endpointRecord.retryCount
    const isFinalAttempt = attempts >= maxAttempts

    await db
      .update(delivery)
      .set({
        status: isFinalAttempt ? "failed" : "pending",
        attempts,
        lastAttemptAt: now,
        updatedAt: now,
      })
      .where(eq(delivery.id, deliveryId))

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
      concurrency: 10,
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
