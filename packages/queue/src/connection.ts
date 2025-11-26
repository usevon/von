import IORedis from "ioredis"
import { env } from "./env"

export type ConnectionOptions = {
  url?: string
  maxRetriesPerRequest?: number | null
}

function getUrl(options: ConnectionOptions = {}) {
  return options.url ?? env.REDIS_URL ?? "redis://localhost:6379"
}

export async function checkRedisConnection(options: ConnectionOptions = {}): Promise<{ ok: boolean; url: string }> {
  const url = getUrl(options)
  const redis = new IORedis(url, {
    maxRetriesPerRequest: 1,
    retryStrategy: () => null,
    lazyConnect: true,
  })

  redis.on("error", () => {})

  try {
    await redis.connect()
    await redis.ping()
    await redis.quit()
    return { ok: true, url }
  } catch {
    await redis.quit().catch(() => {})
    return { ok: false, url }
  }
}

export function createConnection(options: ConnectionOptions = {}) {
  return new IORedis(getUrl(options), {
    maxRetriesPerRequest: options.maxRetriesPerRequest ?? null,
  })
}

// Singleton Redis client for shared use (API key caching, etc.)
let sharedClient: IORedis | null = null

export function getRedisClient(options: ConnectionOptions = {}): IORedis {
  if (!sharedClient) {
    sharedClient = new IORedis(getUrl(options), {
      maxRetriesPerRequest: options.maxRetriesPerRequest ?? null,
      enableReadyCheck: true,
      lazyConnect: false,
    })
  }
  return sharedClient
}
