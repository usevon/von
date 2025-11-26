import { Elysia } from "elysia"
import { cors } from "@elysiajs/cors"
import { serverTiming } from "@elysiajs/server-timing"

import { env } from "@/env"
import { createLogger } from "@von/logger/elysia"
import { checkDatabaseConnection } from "@von/db"
import { checkRedisConnection } from "@von/queue"

import { auth } from "@/modules/auth"
import { endpoints } from "@/modules/endpoints"
import { inbound, inboundPublic } from "@/modules/inbound"
import { webhooks } from "@/modules/webhooks"

const getLogLevel = () => {
  if (env.NODE_ENV === "test") return "silent"
  if (env.NODE_ENV === "development") return "debug"
  return "info"
}

export const log = createLogger({
  level: getLogLevel(),
  pretty: env.NODE_ENV === "development",
})

const getCorsOrigins = () => {
  if (env.NODE_ENV === "development") {
    return ["http://localhost:5173", "http://localhost:5174"]
  }
  if (env.CORS_ORIGINS) {
    return env.CORS_ORIGINS.split(",").map((o) => o.trim())
  }
  return []
}

export const app = new Elysia({
  name: "von-api",
  aot: true,
  normalize: true,
})
  .use(cors({ origin: getCorsOrigins() }))
  .use(serverTiming())
  .derive(() => ({ log }))
  .onAfterResponse({ as: "global" }, ({ request, set }) => {
    log.info({ method: request.method, url: request.url, status: set.status }, "request")
  })
  .onError(({ code, error, set }) => {
    const message = "message" in error ? error.message : String(error)

    if (code === "VALIDATION") {
      set.status = 400
      return { error: message }
    }

    if (code === "NOT_FOUND") {
      set.status = 404
      return { error: "Not found" }
    }

    log.error({ code, err: error }, message)
    return { error: message }
  })
  .get("/live", () => ({ status: "ok", uptime: process.uptime() }))
  .get("/ready", async ({ set }) => {
    const [db, redis] = await Promise.all([
      checkDatabaseConnection(),
      checkRedisConnection(),
    ])

    const ok = db.ok && redis.ok
    set.status = ok ? 200 : 503

    return {
      status: ok ? "ok" : "degraded",
      services: {
        database: db.ok ? "ok" : "unavailable",
        redis: redis.ok ? "ok" : "unavailable",
      },
    }
  })
  .use(auth)
  .use(inboundPublic)
  .use(webhooks)
  .use(endpoints)
  .use(inbound)

export type App = typeof app
