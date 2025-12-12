export type DeliveryEndpoint = {
  id: string
  url: string
  secret: string
  timeoutMs: number
  retryCount: number
  version: string | null
}

export type WebhookDeliveryJob = {
  deliveryId: string
  eventId: string
  payload: string
  eventType: string
  endpoint: DeliveryEndpoint
  organizationId: string
  requestId?: string
}

export type InboundForwardingJob = {
  deliveryId: string
  endpoint: {
    id: string
    forwardUrl: string
    secret: string
    timeoutMs: number
    retryCount: number
  }
  payload: string
  headers: string
  requestId?: string
}

export type QueueName = "webhook-delivery" | "inbound-forwarding"
