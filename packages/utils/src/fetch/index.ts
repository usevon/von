/**
 * Von Fetch Wrapper
 * Inspired by better-fetch by @bekacru
 * https://github.com/better-auth/better-fetch
 */

import type {
  VonFetchOptions,
  VonFetchResponse,
  FetchError,
  RequestContext,
  ResponseContext,
} from "@/fetch/types"
import { createRetryStrategy } from "@/fetch/retry"

export * from "@/fetch/types"
export * from "@/fetch/retry"

export const generateIdempotencyKey = (): string => {
  return `von-${Date.now()}-${crypto.randomUUID()}`
}

const isPayloadMethod = (method: string): boolean => {
  return ["POST", "PUT", "PATCH"].includes(method.toUpperCase())
}

const buildRequestContext = <T>(
  url: string,
  options: VonFetchOptions<T>
): RequestContext => {
  const method = (options.method ?? "GET").toUpperCase()
  const headers = new Headers(options.headers)

  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json")
  }

  const context: RequestContext = {
    url,
    method,
    headers,
    body: options.body,
    signal: options.signal ?? undefined,
  }

  if (isPayloadMethod(method) && !context.idempotencyKey) {
    context.idempotencyKey = generateIdempotencyKey()
    headers.set("X-Idempotency-Key", context.idempotencyKey)
  }

  return context
}

const executeRequest = async (
  context: RequestContext,
  timeout?: number
): Promise<Response> => {
  const controller = new AbortController()
  const signal = context.signal
    ? AbortSignal.any([context.signal, controller.signal])
    : controller.signal

  let timeoutId: ReturnType<typeof setTimeout> | undefined

  if (timeout) {
    timeoutId = setTimeout(() => controller.abort(), timeout)
  }

  try {
    const response = await fetch(context.url, {
      method: context.method,
      headers: context.headers,
      body: context.body ? JSON.stringify(context.body) : undefined,
      signal,
    })
    return response
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
  }
}

const parseResponse = async <T>(response: Response): Promise<T> => {
  const contentType = response.headers.get("Content-Type") ?? ""

  if (contentType.includes("application/json")) {
    return response.json() as Promise<T>
  }

  return response.text() as unknown as T
}

const createFetchError = (
  message: string,
  response?: Response,
  cause?: unknown
): FetchError => ({
  message,
  status: response?.status,
  statusText: response?.statusText,
  cause,
})

export const vonFetch = async <T>(
  url: string,
  options: VonFetchOptions<T> = {}
): Promise<VonFetchResponse<T>> => {
  let context = buildRequestContext(url, options)

  if (options.onRequest) {
    context = await options.onRequest(context)
  }

  const retryStrategy = options.retry ? createRetryStrategy(options.retry) : null
  let attempt = 0
  let lastResponse: Response | null = null
  let lastError: FetchError | null = null

  while (true) {
    try {
      const response = await executeRequest(context, options.timeout)
      lastResponse = response

      const responseContext: ResponseContext = { request: context, response }

      if (options.onResponse) {
        await options.onResponse(responseContext)
      }

      if (response.ok) {
        const data = await parseResponse<T>(response)

        if (options.onSuccess) {
          await options.onSuccess({ request: context, response, data })
        }

        return { data, error: null }
      }

      lastError = createFetchError(
        `Request failed with status ${response.status}`,
        response
      )

      if (options.onError) {
        await options.onError({ request: context, response, error: lastError })
      }

      if (retryStrategy && (await retryStrategy.shouldAttemptRetry(attempt, response))) {
        if (options.onRetry) {
          await options.onRetry(responseContext, attempt)
        }

        const delay = retryStrategy.getDelay(attempt)
        await new Promise((resolve) => setTimeout(resolve, delay))
        attempt++
        continue
      }

      return { data: null, error: lastError }
    } catch (err) {
      lastError = createFetchError(
        err instanceof Error ? err.message : "Unknown error",
        undefined,
        err
      )

      if (options.onError) {
        await options.onError({
          request: context,
          response: null,
          error: lastError,
        })
      }

      if (retryStrategy && (await retryStrategy.shouldAttemptRetry(attempt, null))) {
        if (options.onRetry && lastResponse) {
          await options.onRetry({ request: context, response: lastResponse }, attempt)
        }

        const delay = retryStrategy.getDelay(attempt)
        await new Promise((resolve) => setTimeout(resolve, delay))
        attempt++
        continue
      }

      return { data: null, error: lastError }
    }
  }
}
