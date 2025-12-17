import { Elysia } from "elysia"
import { getRedisClient } from "@usevon/queue"
import { hashSha256 } from "@usevon/utils"

const redis = getRedisClient()
const IDEMPOTENCY_TTL = 60 * 5 // 5 minutes

type CachedResponse = {
  status: number
  body: unknown
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

      const authHeader = request.headers.get("authorization")
      if (!authHeader) {
        return {}
      }

      const authScope = hashSha256(authHeader).slice(0, 16)
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
