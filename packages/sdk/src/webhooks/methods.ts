import type { Von } from '@/client'
import type { PaginationParams } from '@/types'
import type {
  SendWebhookParams,
  SendBatchParams,
  WebhookEvent,
  WebhookEventsResponse,
  SendBatchResponse,
} from './types'

export const webhooksMethods = (client: Von) => ({
  send: (params: SendWebhookParams) => {
    return client.post<WebhookEvent>('/webhooks', params)
  },

  sendBatch: (params: SendBatchParams) => {
    return client.post<SendBatchResponse>('/webhooks/batch', params)
  },

  list: (params?: PaginationParams) => {
    const searchParams = new URLSearchParams()
    if (params?.limit) searchParams.set('limit', String(params.limit))
    if (params?.offset) searchParams.set('offset', String(params.offset))
    const query = searchParams.toString()
    return client.get<WebhookEventsResponse>(`/webhooks/events${query ? `?${query}` : ''}`)
  },

  get: (id: string) => {
    return client.get<WebhookEvent>(`/webhooks/events/${id}`)
  },
})
