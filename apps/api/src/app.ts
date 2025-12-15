import { Elysia } from "elysia"
import { cors } from "@elysiajs/cors"

import { env } from "@/env"
import { idempotency } from "@/lib/idempotency"
import { errorHandler } from "@/lib/error-handler"
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
  .use(errorHandler(env.NODE_ENV === "production"))
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