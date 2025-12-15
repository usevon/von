import { Elysia } from "elysia"
import { getRedisClient } from "@usevon/queue"

const redis = getRedisClient()

type RateLimitOptions = {
  windowMs: number
  max: number
  keyPrefix?: string
}

const getClientIp = (request: Request, ip?: string): string => {
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? "unknown"
  }
  return ip ?? "unknown"
}

export const rateLimit = (options: RateLimitOptions) => {
  const { windowMs, max, keyPrefix = "ratelimit" } = options
  const windowSeconds = Math.ceil(windowMs / 1000)

  return new Elysia({ name: "rate-limit" })
    .derive(async ({ request, set, ip }) => {
      const clientIp = getClientIp(request, ip)
      const key = `${keyPrefix}:${clientIp}`

      const current = await redis.incr(key)
      if (current === 1) {
        await redis.expire(key, windowSeconds)
      }

      const remaining = Math.max(0, max - current)
      const ttl = await redis.ttl(key)

      set.headers["X-RateLimit-Limit"] = String(max)
      set.headers["X-RateLimit-Remaining"] = String(remaining)
      set.headers["X-RateLimit-Reset"] = String(Math.ceil(Date.now() / 1000) + ttl)

      if (current > max) {
        set.status = 429
        set.headers["Retry-After"] = String(ttl)
        return { rateLimited: true }
      }

      return { rateLimited: false }
    })
    .onBeforeHandle(({ rateLimited }) => {
      if (rateLimited) {
        return { error: "Too many requests. Please try again later." }
      }
    })
}
