export type WebhookDeliveryJob = {
  deliveryId: string
  eventId: string
  endpointId: string
}

export type InboundForwardingJob = {
  deliveryId: string
  endpointId: string
}

export type QueueName = "webhook-delivery" | "inbound-forwarding"
