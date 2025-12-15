import { Elysia } from "elysia"
import { cors } from "@elysiajs/cors"
import { env } from "@/env"
import { checkDatabaseConnection } from "@usevon/db"
import { checkRedisConnection } from "@usevon/queue"
import { UnauthorizedError, BadRequestError } from "@usevon/utils"
import { errorHandler } from "@/lib/error-handler"
import { tunnelRegister, tunnelWs, tunnelProxy } from "@/modules/tunnel"

export const app = new Elysia({
  name: "von-tunnel",
  aot: true,
  normalize: true,
  nativeStaticResponse: true,
})
  .error({ UnauthorizedError, BadRequestError })
  .use(cors())
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
  .use(tunnelRegister)
  .use(tunnelWs)
  .use(tunnelProxy)

export type App = typeof app
