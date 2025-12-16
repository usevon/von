import type { Von } from "@/client"
import type { PaginationParams } from "@/types"

const buildQuery = (params?: PaginationParams): string => {
  if (!params) return ""
  const searchParams = new URLSearchParams()
  if (params.limit) searchParams.set("limit", String(params.limit))
  if (params.offset) searchParams.set("offset", String(params.offset))
  const query = searchParams.toString()
  return query ? `?${query}` : ""
}

export const createCrudMethods = <TCreate, TUpdate, TItem, TListResponse>(
  client: Von,
  resource: string
) => ({
  create: (params: TCreate) => client.post<TItem>(`/${resource}`, params),
  list: (params?: PaginationParams) => client.get<TListResponse>(`/${resource}${buildQuery(params)}`),
  get: (id: string) => client.get<TItem>(`/${resource}/${id}`),
  update: (id: string, params: TUpdate) => client.patch<TItem>(`/${resource}/${id}`, params),
  delete: (id: string) => client.delete<void>(`/${resource}/${id}`),
})
