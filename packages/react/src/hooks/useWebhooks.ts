import { useState, useEffect, useCallback } from "react"
import { useWebSocketContext, useApiContext } from "../provider"

type WebhookEvent = {
  id: string
  eventType: string
  payload: unknown
  idempotencyKey: string | null
  status: string
  createdAt: string
}

type UseWebhooksResult = {
  events: WebhookEvent[]
  isLoading: boolean
  isConnected: boolean
  error: Error | null
  refresh: () => Promise<void>
}

export const useWebhooks = (): UseWebhooksResult => {
  const [events, setEvents] = useState<WebhookEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const { isConnected, subscribe, unsubscribe } = useWebSocketContext()
  const { apiUrl } = useApiContext()

  const fetchEvents = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`${apiUrl}/webhooks/events`, {
        credentials: "include",
      })

      if (!response.ok) {
        throw new Error("Failed to fetch webhook events")
      }

      const data = await response.json()
      setEvents(data.events || [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)))
    } finally {
      setIsLoading(false)
    }
  }, [apiUrl])

  useEffect(() => {
    fetchEvents()

    const handleUpdate = (data: unknown) => {
      const event = data as WebhookEvent
      setEvents((prev) => {
        const existing = prev.findIndex((e) => e.id === event.id)
        if (existing >= 0) {
          const updated = [...prev]
          updated[existing] = event
          return updated
        }
        return [event, ...prev]
      })
    }

    subscribe("webhook_events", handleUpdate)

    return () => {
      unsubscribe("webhook_events")
    }
  }, [fetchEvents, subscribe, unsubscribe])

  return {
    events,
    isLoading,
    isConnected,
    error,
    refresh: fetchEvents,
  }
}
