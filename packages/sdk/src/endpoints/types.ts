export type CreateEndpointParams = {
  url: string
  description?: string
  enabled?: boolean
  retryCount?: number
  timeoutMs?: number
}

export type UpdateEndpointParams = {
  url?: string
  description?: string
  enabled?: boolean
  retryCount?: number
  timeoutMs?: number
}

export type Endpoint = {
  id: string
  url: string
  secret: string
  description: string | null
  enabled: boolean
  retryCount: number
  timeoutMs: number
  createdAt: string
  updatedAt: string
}

export type EndpointsResponse = {
  endpoints: Endpoint[]
  total: number
}
