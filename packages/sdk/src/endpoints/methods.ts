import type { Von } from '@/client'
import type { PaginationParams } from '@/types'
import type {
  CreateEndpointParams,
  UpdateEndpointParams,
  Endpoint,
  EndpointsResponse,
} from '@/endpoints/types'

export const endpointsMethods = (client: Von) => ({
  create: (params: CreateEndpointParams) => {
    return client.post<Endpoint>('/endpoints', params)
  },

  list: (params?: PaginationParams) => {
    const searchParams = new URLSearchParams()
    if (params?.limit) searchParams.set('limit', String(params.limit))
    if (params?.offset) searchParams.set('offset', String(params.offset))
    const query = searchParams.toString()
    return client.get<EndpointsResponse>(`/endpoints${query ? `?${query}` : ''}`)
  },

  get: (id: string) => {
    return client.get<Endpoint>(`/endpoints/${id}`)
  },

  update: (id: string, params: UpdateEndpointParams) => {
    return client.patch<Endpoint>(`/endpoints/${id}`, params)
  },

  delete: (id: string) => {
    return client.delete<void>(`/endpoints/${id}`)
  },
})
