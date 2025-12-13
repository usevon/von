import { useFetch } from "@/hooks/useFetch"

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

export const useInbound = () => {
  const result = useFetch<InboundEndpoint[]>({
    endpoint: "inbound",
    parseData: (data: unknown) => (data as { endpoints: InboundEndpoint[] }).endpoints ?? [],
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

export type { InboundEndpoint }
