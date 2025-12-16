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
  if (env.NODE_ENV !== "production") {
    return ["http://localhost:5173", "http://localhost:5174"]
  }
  if (!env.CORS_ORIGINS) {
    throw new Error("CORS_ORIGINS required in production")
  }
  return env.CORS_ORIGINS.split(",").map((o) => o.trim())
}

const corsMiddleware = cors({ origin: getCorsOrigins() })

const browserRoutes = new Elysia()
  .use(corsMiddleware)
  .use(auth)

const securityHeaders = new Elysia({ name: "security-headers" }).onAfterHandle(
  ({ set }) => {
    set.headers["X-Content-Type-Options"] = "nosniff"
    set.headers["X-Frame-Options"] = "DENY"
    set.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    if (env.NODE_ENV === "production") {
      set.headers["Strict-Transport-Security"] =
        "max-age=31536000; includeSubDomains"
    }
  }
)

export const app = new Elysia({
  name: "von-api",
  aot: true,
  normalize: true,
  nativeStaticResponse: true,
})
  .use(securityHeaders)
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
    const statusMap: Record<string, number> = {
      UnauthorizedError: 401, NotFoundError: 404, BadRequestError: 400,
      ForbiddenError: 403, ConflictError: 409, InternalServerError: 500,
      VALIDATION: 400, NOT_FOUND: 404,
    }
    const status = statusMap[code]
    const isProd = env.NODE_ENV === "production"
    const message = "message" in error ? error.message : String(error)
    if (status) {
      set.status = status
      return { error: status === 500 && isProd ? "Internal server error" : message }
    }
    console.error({ code, error: message })
    set.status = 500
    return { error: isProd ? "Internal server error" : String(error) }
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

export type App = typeof app