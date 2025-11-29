import { useFetch } from "./useFetch"

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

export const useEndpoints = () => {
  const result = useFetch<Endpoint[]>({
    endpoint: "endpoints",
    parseData: (data: unknown) => (data as { endpoints: Endpoint[] }).endpoints ?? [],
  })

  return {
    endpoints: result.data ?? [],
    isLoading: result.isLoading,
    isRefreshing: result.isRefreshing,
    error: result.error,
    refresh: result.refresh,
    mutate: result.mutate,
  }
}

export type { Endpoint }
