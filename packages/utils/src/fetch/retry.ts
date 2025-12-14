import type { LinearRetry, ExponentialRetry, RetryOptions } from "@/fetch/types"

export type RetryStrategy = {
  shouldAttemptRetry(attempt: number, response: Response | null): Promise<boolean>
  getDelay(attempt: number): number
}

const DEFAULT_SHOULD_RETRY = (response: Response | null): boolean => {
  if (response === null) return true
  if (response.status >= 500) return true
  if (response.status === 429) return true
  return false
}

export const createLinearRetryStrategy = (options: LinearRetry): RetryStrategy => {
  const shouldRetry = options.shouldRetry ?? DEFAULT_SHOULD_RETRY

  return {
    async shouldAttemptRetry(attempt: number, response: Response | null): Promise<boolean> {
      if (attempt + 1 >= options.attempts) return false
      return shouldRetry(response)
    },
    getDelay(): number {
      return options.delay
    },
  }
}

export const createExponentialRetryStrategy = (options: ExponentialRetry): RetryStrategy => {
  const shouldRetry = options.shouldRetry ?? DEFAULT_SHOULD_RETRY

  return {
    async shouldAttemptRetry(attempt: number, response: Response | null): Promise<boolean> {
      if (attempt + 1 >= options.attempts) return false
      return shouldRetry(response)
    },
    getDelay(attempt: number): number {
      const delay = options.baseDelay * Math.pow(2, attempt)
      return Math.min(delay, options.maxDelay)
    },
  }
}

export const createRetryStrategy = (options: RetryOptions): RetryStrategy => {
  if (typeof options === "number") {
    return createLinearRetryStrategy({
      type: "linear",
      attempts: options,
      delay: 1000,
    })
  }

  if (options.type === "linear") {
    return createLinearRetryStrategy(options)
  }

  return createExponentialRetryStrategy(options)
}
