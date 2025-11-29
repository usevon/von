import { useState, useEffect, useCallback } from "react"
import { useVonContext } from "../provider"

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
  error: Error | null
  refresh: () => Promise<void>
}

export const useWebhooks = (): UseWebhooksResult => {
  const [events, setEvents] = useState<WebhookEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const { apiUrl, getToken } = useVonContext()

  const fetchEvents = useCallback(async () => {
    try {
      setIsLoading(true)
      const token = await getToken()
      const response = await fetch(`${apiUrl}/webhooks/events`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
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
  }, [apiUrl, getToken])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  return {
    events,
    isLoading,
    error,
    refresh: fetchEvents,
  }
}
