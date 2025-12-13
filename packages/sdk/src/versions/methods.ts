import type { Von } from '@/client'
import type { PaginationParams } from '@/types'
import type {
  CreateVersionParams,
  UpdateVersionParams,
  WebhookVersion,
  VersionsResponse,
} from '@/versions/types'

export const versionsMethods = (client: Von) => ({
  create: (params: CreateVersionParams) => {
    return client.post<WebhookVersion>('/versions', params)
  },

  list: (params?: PaginationParams) => {
    const searchParams = new URLSearchParams()
    if (params?.limit) searchParams.set('limit', String(params.limit))
    if (params?.offset) searchParams.set('offset', String(params.offset))
    const query = searchParams.toString()
    return client.get<VersionsResponse>(`/versions${query ? `?${query}` : ''}`)
  },

  get: (version: string) => {
    return client.get<WebhookVersion>(`/versions/${version}`)
  },

  update: (version: string, params: UpdateVersionParams) => {
    return client.patch<WebhookVersion>(`/versions/${version}`, params)
  },

  delete: (version: string) => {
    return client.delete<void>(`/versions/${version}`)
  },
})
