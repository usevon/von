import { Queue } from "bullmq"
import { createConnection } from "./connection"
import type { WebhookDeliveryJob } from "./types"

let webhookDeliveryQueue: Queue<WebhookDeliveryJob> | null = null

export const getWebhookDeliveryQueue = () => {
  if (!webhookDeliveryQueue) {
    webhookDeliveryQueue = new Queue<WebhookDeliveryJob>("webhook-delivery", {
      connection: createConnection(),
      defaultJobOptions: {
        attempts: 5,
        backoff: {
          type: "exponential",
          delay: 1000,
        },
        removeOnComplete: {
          count: 1000,
          age: 24 * 60 * 60,
        },
        removeOnFail: {
          count: 5000,
          age: 7 * 24 * 60 * 60,
        },
      },
    })
  }

  return webhookDeliveryQueue
}
