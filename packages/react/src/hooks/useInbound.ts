import { useState, useEffect, useCallback } from "react"
import { useVonContext } from "../provider"

type InboundEndpoint = {
  id: string
  name: string | null
  provider: string | null
  secret: string
  forwardUrl: string
  enabled: boolean
  createdAt: string
  updatedAt: string
}

type UseInboundResult = {
  endpoints: InboundEndpoint[]
  isLoading: boolean
  error: Error | null
  refresh: () => Promise<void>
}

export const useInbound = (): UseInboundResult => {
  const [endpoints, setEndpoints] = useState<InboundEndpoint[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const { apiUrl, getToken } = useVonContext()

  const fetchEndpoints = useCallback(async () => {
    try {
      setIsLoading(true)
      const token = await getToken()
      const response = await fetch(`${apiUrl}/inbound`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })

      if (!response.ok) {
        throw new Error("Failed to fetch inbound endpoints")
      }

      const data = await response.json()
      setEndpoints(data.endpoints || [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)))
    } finally {
      setIsLoading(false)
    }
  }, [apiUrl, getToken])

  useEffect(() => {
    fetchEndpoints()
  }, [fetchEndpoints])

  return {
    endpoints,
    isLoading,
    error,
    refresh: fetchEndpoints,
  }
}
