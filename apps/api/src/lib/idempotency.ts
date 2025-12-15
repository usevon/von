import { Elysia } from "elysia"
import { getRedisClient } from "@usevon/queue"

const redis = getRedisClient()
const IDEMPOTENCY_TTL = 60 * 60 * 24 // 24 hours

type CachedResponse = {
  status: number
  body: unknown
}

const hashAuthHeader = async (auth: string): Promise<string> => {
  const encoder = new TextEncoder()
  const data = encoder.encode(auth)
  const hashBuffer = await crypto.subtle.digest("SHA-256", data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.slice(0, 8).map(b => b.toString(16).padStart(2, "0")).join("")
}

export const idempotency = () =>
  new Elysia({ name: "idempotency" })
    .derive(async ({ request, set }) => {
      const method = request.method

      if (!["POST", "PUT", "PATCH"].includes(method)) {
        return {}
      }

      const idempotencyKey = request.headers.get("x-idempotency-key")
      if (!idempotencyKey) {
        return {}
      }

      const authHeader = request.headers.get("authorization") ?? ""
      const authScope = await hashAuthHeader(authHeader)
      const cacheKey = `idempotency:${authScope}:${idempotencyKey}`
      const cached = await redis.get(cacheKey)

      if (cached) {
        const response: CachedResponse = JSON.parse(cached)
        set.status = response.status
        return { idempotencyCached: true, cachedResponse: response.body }
      }

      return { idempotencyCacheKey: cacheKey, idempotencyCached: false }
    })
    .onBeforeHandle(({ idempotencyCached, cachedResponse }) => {
      if (idempotencyCached) {
        return cachedResponse
      }
    })
    .onAfterHandle(async ({ idempotencyCacheKey, response, set }) => {
      if (!idempotencyCacheKey) return

      const toCache: CachedResponse = {
        status: (set.status as number) || 200,
        body: response,
      }

      await redis.setex(idempotencyCacheKey, IDEMPOTENCY_TTL, JSON.stringify(toCache))
    })
