export type VonConfig = {
  apiKey?: string
  baseUrl?: string
}

export type PaginationParams = {
  limit?: number
  offset?: number
}

export type PaginatedResponse<T> = {
  data: T[]
  total: number
}
