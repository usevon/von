import { Elysia } from "elysia"
import { cors } from "@elysiajs/cors"

import { env } from "@/env"
import { idempotency } from "@/lib/idempotency"
import { checkDatabaseConnection } from "@usevon/db"
import { checkRedisConnection } from "@usevon/queue"

import { auth, withApiKey } from "@/modules/auth"
import { endpoints } from "@/modules/endpoints"
import { inbound, inboundPublic } from "@/modules/inbound"
import { webhooks, webhookEvents } from "@/modules/webhooks"
import { tunnel, tunnelWs, tunnelPublic } from "@/modules/tunnel"
import { versions } from "@/modules/versions"
import {
  UnauthorizedError,
  NotFoundError,
  BadRequestError,
  ForbiddenError,
  ConflictError,
  InternalServerError,
} from "@usevon/utils"

const ping = new Elysia({ prefix: "/ping" })
  .use(withApiKey)
  .get("/", () => ({ ok: true }))

const getCorsOrigins = () => {
  if (env.NODE_ENV === "development") {
    return ["http://localhost:5173", "http://localhost:5174"]
  }
  if (env.CORS_ORIGINS) {
    return env.CORS_ORIGINS.split(",").map((o) => o.trim())
  }
  return []
}

const corsMiddleware = cors({ origin: getCorsOrigins() })

const browserRoutes = new Elysia()
  .use(corsMiddleware)
  .use(auth)

export const app = new Elysia({
  name: "von-api",
  aot: true,
  normalize: true,
  nativeStaticResponse: true,
})
  .error({
    UnauthorizedError,
    NotFoundError,
    BadRequestError,
    ForbiddenError,
    ConflictError,
    InternalServerError,
  })
  .use(idempotency())
  .onError(({ code, error, set }) => {
    if (code === "UnauthorizedError") {
      set.status = 401
      return { error: error.message }
    }

    if (code === "NotFoundError") {
      set.status = 404
      return { error: error.message }
    }

    if (code === "BadRequestError") {
      set.status = 400
      return { error: error.message }
    }

    if (code === "ForbiddenError") {
      set.status = 403
      return { error: error.message }
    }

    if (code === "ConflictError") {
      set.status = 409
      return { error: error.message }
    }

    if (code === "InternalServerError") {
      set.status = 500
      return { error: env.NODE_ENV === "production" ? "Internal server error" : error.message }
    }

    if (code === "VALIDATION") {
      set.status = 400
      return { error: "message" in error ? error.message : "Validation failed" }
    }

    if (code === "NOT_FOUND") {
      set.status = 404
      return { error: "Not found" }
    }

    console.error({ code, error: "message" in error ? error.message : String(error) })
    set.status = 500
    return { error: env.NODE_ENV === "production" ? "Internal server error" : String(error) }
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
  .use(browserRoutes)
  .use(ping)
  .use(inboundPublic)
  .use(webhooks)
  .use(webhookEvents)
  .use(endpoints)
  .use(inbound)
  .use(versions)
  .use(tunnel)
  .use(tunnelWs)
  .use(tunnelPublic)

export type App = typeof app