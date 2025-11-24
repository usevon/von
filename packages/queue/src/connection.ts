import IORedis from "ioredis"
import { env } from "./env"

export type ConnectionOptions = {
  url?: string
  maxRetriesPerRequest?: number | null
}

export const createConnection = (options: ConnectionOptions = {}) => {
  const url = options.url ?? env.REDIS_URL ?? "redis://localhost:6379"

  return new IORedis(url, {
    maxRetriesPerRequest: options.maxRetriesPerRequest ?? null,
  })
}
