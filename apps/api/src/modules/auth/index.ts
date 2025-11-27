import { Elysia } from "elysia"
import { createAuth, type Auth } from "@von/auth"
import { getRedisClient } from "@von/queue"
import { db } from "@von/db"
import { env } from "@/env"

const redis = getRedisClient()

const CACHE_TTL_SECONDS = 300
const MEMORY_CACHE_TTL_MS = 60000

type CachedApiKey = {
  id: string
  name: string | null
  start: string | null
  userId: string | null
  organizationId: string | null
  expiresAt: string | null
  enabled: boolean
  rateLimitPerSecond: number | null
  createdAt: string
  updatedAt: string
}

type MemoryCacheEntry = {
  data: CachedApiKey
  expiry: number
}

const memoryCache = new Map<string, MemoryCacheEntry>()

const betterAuth: Auth = createAuth(db, {
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL ?? `http://localhost:${env.PORT}`,
  trustedOrigins: env.NODE_ENV === "development"
    ? ["http://localhost:5173", "http://localhost:5174"]
    : [],
  secondaryStorage: {
    get: async (key) => await redis.get(key),
    set: async (key, value, ttl) => {
      if (ttl) {
        await redis.setex(key, ttl, value)
      } else {
        await redis.set(key, value)
      }
    },
    delete: async (key) => {
      await redis.del(key)
    },
  },
})

export const auth = new Elysia({ name: "better-auth" })
  .mount(betterAuth.handler)

export const withApiKey = new Elysia({ name: "api-key-auth" })
  .derive({ as: "scoped" }, async ({ headers, set }) => {
    const authHeader = headers["authorization"]
    if (!authHeader?.startsWith("Bearer ")) {
      set.status = 401
      throw new Error("Invalid API key.")
    }
    const rawKey = authHeader.slice(7)
    const cacheKey = `apikey:${rawKey}`

    const memEntry = memoryCache.get(cacheKey)
    if (memEntry && memEntry.expiry > Date.now()) {
      const apiKey = memEntry.data
      if (apiKey.enabled && apiKey.organizationId) {
        if (!apiKey.expiresAt || new Date(apiKey.expiresAt).getTime() > Date.now()) {
          return {
            apiKey,
            organizationId: apiKey.organizationId,
            userId: apiKey.userId ?? "",
          }
        }
      }
      memoryCache.delete(cacheKey)
    }

    const cached = await redis.get(cacheKey)
    if (cached) {
      const apiKey = JSON.parse(cached) as CachedApiKey
      if (apiKey.enabled && apiKey.organizationId) {
        if (!apiKey.expiresAt || new Date(apiKey.expiresAt).getTime() > Date.now()) {
          memoryCache.set(cacheKey, { data: apiKey, expiry: Date.now() + MEMORY_CACHE_TTL_MS })
          return {
            apiKey,
            organizationId: apiKey.organizationId,
            userId: apiKey.userId ?? "",
          }
        }
      }
      await redis.del(cacheKey)
    }

    const result = await betterAuth.api.verifyApiKey({ body: { key: rawKey } })
    if (!result.valid) {
      set.status = 401
      throw new Error("Invalid API key.")
    }

    const organizationId = result.key?.organizationId
    if (!organizationId) {
      set.status = 401
      throw new Error("Invalid API key.")
    }

    await redis.setex(cacheKey, CACHE_TTL_SECONDS, JSON.stringify(result.key))
    memoryCache.set(cacheKey, { data: result.key as CachedApiKey, expiry: Date.now() + MEMORY_CACHE_TTL_MS })

    return {
      apiKey: result.key,
      organizationId,
      userId: result.key?.userId ?? "",
    }
  })

export { betterAuth }
