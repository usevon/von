import { t, type Static } from "elysia"

export const SendWebhookBody = t.Object({
  eventType: t.String(),
  payload: t.Unknown(),
  idempotencyKey: t.Optional(t.String()),
  endpointIds: t.Optional(t.Array(t.String({ format: "uuid" }))),
})

export const WebhookEvent = t.Object({
  id: t.String({ format: "uuid" }),
  eventType: t.String(),
  payload: t.Unknown(),
  idempotencyKey: t.Union([t.String(), t.Null()]),
  status: t.String(),
  createdAt: t.String(),
})

export const WebhookEventList = t.Object({
  events: t.Array(WebhookEvent),
  total: t.Number(),
})

export const Delivery = t.Object({
  id: t.String({ format: "uuid" }),
  eventId: t.String({ format: "uuid" }),
  endpointId: t.String({ format: "uuid" }),
  status: t.String(),
  attempts: t.Number(),
  nextAttemptAt: t.Union([t.String(), t.Null()]),
  lastAttemptAt: t.Union([t.String(), t.Null()]),
  responseStatus: t.Union([t.Number(), t.Null()]),
  createdAt: t.String(),
})

export type SendWebhookBodyType = Static<typeof SendWebhookBody>
export type WebhookEventType = Static<typeof WebhookEvent>
export type DeliveryType = Static<typeof Delivery>
