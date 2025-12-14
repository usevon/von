import type { RetryOptions, FetchHooks } from "@usevon/utils"

export type VonConfig = {
  apiKey?: string
  baseUrl?: string
  retry?: RetryOptions
  hooks?: Omit<FetchHooks, "onSuccess" | "onError">
  timeout?: number
}

export type PaginationParams = {
  limit?: number
  offset?: number
}

export type PaginatedResponse<T> = {
  data: T[]
  total: number
}
