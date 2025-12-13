import type { Von } from '@/client'
import type { PaginationParams } from '@/types'
import type {
  CreateInboundParams,
  UpdateInboundParams,
  InboundEndpoint,
  InboundEndpointsResponse,
} from '@/inbound/types'

export const inboundMethods = (client: Von) => ({
  create: (params: CreateInboundParams) => {
    return client.post<InboundEndpoint>('/inbound', params)
  },

  list: (params?: PaginationParams) => {
    const searchParams = new URLSearchParams()
    if (params?.limit) searchParams.set('limit', String(params.limit))
    if (params?.offset) searchParams.set('offset', String(params.offset))
    const query = searchParams.toString()
    return client.get<InboundEndpointsResponse>(`/inbound${query ? `?${query}` : ''}`)
  },

  get: (id: string) => {
    return client.get<InboundEndpoint>(`/inbound/${id}`)
  },

  update: (id: string, params: UpdateInboundParams) => {
    return client.patch<InboundEndpoint>(`/inbound/${id}`, params)
  },

  delete: (id: string) => {
    return client.delete<void>(`/inbound/${id}`)
  },
})
