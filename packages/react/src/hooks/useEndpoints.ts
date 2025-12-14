import { useFetch } from "@/hooks/useFetch"

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
  const result = useFetch<{ endpoints: Endpoint[] }, Endpoint[]>({
    endpoint: "endpoints",
    parseData: (data: { endpoints: Endpoint[] }) => data.endpoints ?? [],
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
