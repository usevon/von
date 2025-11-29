import { z } from 'zod'

export const SendWebhookParamsSchema = z.object({
  eventType: z.string(),
  payload: z.unknown(),
  idempotencyKey: z.string().optional(),
  endpointIds: z.array(z.string()).optional(),
})

export type SendWebhookParams = z.infer<typeof SendWebhookParamsSchema>

export const SendBatchParamsSchema = z.object({
  events: z.array(SendWebhookParamsSchema),
})

export type SendBatchParams = z.infer<typeof SendBatchParamsSchema>

export const WebhookEventSchema = z.object({
  id: z.string(),
  eventType: z.string(),
  payload: z.unknown(),
  idempotencyKey: z.string().nullable(),
  status: z.string(),
  createdAt: z.string(),
})

export type WebhookEvent = z.infer<typeof WebhookEventSchema>

export const WebhookEventsResponseSchema = z.object({
  events: z.array(WebhookEventSchema),
  total: z.number(),
})

export type WebhookEventsResponse = z.infer<typeof WebhookEventsResponseSchema>

export const SendBatchResponseSchema = z.object({
  created: z.number(),
  events: z.array(WebhookEventSchema),
})

export type SendBatchResponse = z.infer<typeof SendBatchResponseSchema>
