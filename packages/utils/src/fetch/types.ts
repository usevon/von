export type LinearRetry = {
  type: "linear"
  attempts: number
  delay: number
  shouldRetry?: (response: Response | null) => boolean | Promise<boolean>
}

export type ExponentialRetry = {
  type: "exponential"
  attempts: number
  baseDelay: number
  maxDelay: number
  shouldRetry?: (response: Response | null) => boolean | Promise<boolean>
}

export type RetryOptions = number | LinearRetry | ExponentialRetry

export type RequestContext = {
  url: string
  method: string
  headers: Headers
  body?: unknown
  idempotencyKey?: string
  signal?: AbortSignal
}

export type ResponseContext = {
  request: RequestContext
  response: Response
}

export type SuccessContext<T> = {
  request: RequestContext
  response: Response
  data: T
}

export type ErrorContext = {
  request: RequestContext
  response: Response | null
  error: FetchError
}

export type FetchHooks<T = unknown> = {
  onRequest?: (ctx: RequestContext) => RequestContext | Promise<RequestContext>
  onResponse?: (ctx: ResponseContext) => Response | Promise<Response>
  onSuccess?: (ctx: SuccessContext<T>) => void | Promise<void>
  onError?: (ctx: ErrorContext) => void | Promise<void>
  onRetry?: (ctx: ResponseContext, attempt: number) => void | Promise<void>
}

export type VonFetchOptions<T = unknown> = Omit<RequestInit, "body"> &
  FetchHooks<T> & {
    baseURL?: string
    timeout?: number
    retry?: RetryOptions
    body?: unknown
  }

export type VonFetchResponse<T, E = FetchError> =
  | { data: T; error: null }
  | { data: null; error: E }

export type FetchError = {
  message: string
  status?: number
  statusText?: string
  cause?: unknown
}
