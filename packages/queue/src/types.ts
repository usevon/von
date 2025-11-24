export type WebhookDeliveryJob = {
  deliveryId: string
  eventId: string
  endpointId: string
}

export type QueueName = "webhook-delivery"
