import { useState, useEffect, useCallback } from "react"
import { useVonContext } from "../provider"

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
  error: Error | null
  refresh: () => Promise<void>
}

export const useEndpoints = (): UseEndpointsResult => {
  const [endpoints, setEndpoints] = useState<Endpoint[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const { apiUrl, getToken } = useVonContext()

  const fetchEndpoints = useCallback(async () => {
    try {
      setIsLoading(true)
      const token = await getToken()
      const response = await fetch(`${apiUrl}/endpoints`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
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
