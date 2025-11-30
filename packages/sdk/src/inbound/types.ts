export type CreateInboundParams = {
  name?: string
  provider?: string
  forwardUrl: string
  enabled?: boolean
}

export type UpdateInboundParams = {
  name?: string
  provider?: string
  forwardUrl?: string
  enabled?: boolean
}

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

export type InboundEndpointsResponse = {
  inboundEndpoints: InboundEndpoint[]
  total: number
}
