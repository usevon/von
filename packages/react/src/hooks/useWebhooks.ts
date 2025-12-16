import { createResource } from "@/hooks/useResource"

export type WebhookEvent = {
  id: string
  eventType: string
  payload: unknown
  idempotencyKey: string | null
  status: string
  createdAt: string
}

type WebhooksResponse = { events: WebhookEvent[] }

export const useWebhooks = createResource<WebhooksResponse, WebhookEvent>("webhooks/events", "events")
