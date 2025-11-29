import { useFetch } from "./useFetch"

type WebhookEvent = {
  id: string
  eventType: string
  payload: unknown
  idempotencyKey: string | null
  status: string
  createdAt: string
}

export const useWebhooks = () => {
  const result = useFetch<WebhookEvent[]>({
    endpoint: "webhooks/events",
    parseData: (data: unknown) => (data as { events: WebhookEvent[] }).events ?? [],
  })

  return {
    events: result.data ?? [],
    isLoading: result.isLoading,
    isRefreshing: result.isRefreshing,
    error: result.error,
    refresh: result.refresh,
    mutate: result.mutate,
  }
}

export type { WebhookEvent }
