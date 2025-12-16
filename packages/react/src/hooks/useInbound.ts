import { createResource } from "@/hooks/useResource"

export type InboundEndpoint = {
  id: string
  name: string | null
  provider: string | null
  secret: string
  forwardUrl: string
  enabled: boolean
  createdAt: string
  updatedAt: string
}

type InboundResponse = { endpoints: InboundEndpoint[] }

export const useInbound = createResource<InboundResponse, InboundEndpoint>("inbound", "endpoints")