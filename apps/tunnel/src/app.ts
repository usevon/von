import { Elysia } from "elysia"
import { cors } from "@elysiajs/cors"
import { env } from "@/env"
import { checkDatabaseConnection } from "@usevon/db"
import { checkRedisConnection } from "@usevon/queue"
import { UnauthorizedError, BadRequestError } from "@usevon/utils"
import { tunnelRegister, tunnelWs, tunnelProxy } from "@/modules/tunnel"

export const app = new Elysia({
  name: "von-tunnel",
  aot: true,
  normalize: true,
})
  .error({ UnauthorizedError, BadRequestError })
  .onError(({ code, error, set }) => {
    if (code === "UnauthorizedError") {
      set.status = 401
      return { error: error.message }
    }
    if (code === "BadRequestError") {
      set.status = 400
      return { error: error.message }
    }
    if (code === "VALIDATION") {
      set.status = 400
      return { error: "message" in error ? error.message : "Validation failed" }
    }
    console.error({ code, error })
    set.status = 500
    return { error: env.NODE_ENV === "production" ? "Internal server error" : String(error) }
  })
  .use(cors())
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
  .use(tunnelRegister)
  .use(tunnelWs)
  .use(tunnelProxy)

export type App = typeof app
