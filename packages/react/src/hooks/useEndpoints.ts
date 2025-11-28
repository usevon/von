import { useState, useEffect, useCallback } from "react"
import { useWebSocketContext, useApiContext } from "../provider"

type Endpoint = {
  id: string
  url: string
  description: string | null
  secret: string
  enabled: boolean
  retryCount: number
  timeoutMs: number
  createdAt: string
  updatedAt: string
}

type UseEndpointsResult = {
  endpoints: Endpoint[]
  isLoading: boolean
  isConnected: boolean
  error: Error | null
  refresh: () => Promise<void>
}

export const useEndpoints = (): UseEndpointsResult => {
  const [endpoints, setEndpoints] = useState<Endpoint[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const { isConnected, subscribe, unsubscribe } = useWebSocketContext()
  const { apiUrl } = useApiContext()

  const fetchEndpoints = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`${apiUrl}/endpoints`, {
        credentials: "include",
      })

      if (!response.ok) {
        throw new Error("Failed to fetch endpoints")
      }

      const data = await response.json()
      setEndpoints(data.endpoints || [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)))
    } finally {
      setIsLoading(false)
    }
  }, [apiUrl])

  useEffect(() => {
    fetchEndpoints()

    const handleUpdate = (data: unknown) => {
      const endpoint = data as Endpoint
      setEndpoints((prev) => {
        const existing = prev.findIndex((e) => e.id === endpoint.id)
        if (existing >= 0) {
          const updated = [...prev]
          updated[existing] = endpoint
          return updated
        }
        return [endpoint, ...prev]
      })
    }

    subscribe("endpoints", handleUpdate)

    return () => {
      unsubscribe("endpoints")
    }
  }, [fetchEndpoints, subscribe, unsubscribe])

  return {
    endpoints,
    isLoading,
    isConnected,
    error,
    refresh: fetchEndpoints,
  }
}
