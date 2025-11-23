import { Elysia } from "elysia"
import { cors } from "@elysiajs/cors"
import { serverTiming } from "@elysiajs/server-timing"
import { env } from "@von/env"
import { createElysiaLogger } from "@von/logger/elysia"
import { authRoutes } from "@/modules/auth"
import { webhooks } from "@/modules/webhooks"
import { endpoints } from "@/modules/endpoints"
import { inboundManagement, inboundReceiver } from "@/modules/inbound"

const app = new Elysia()
  .use(cors())
  .use(serverTiming())
  .use(createElysiaLogger({ level: env.NODE_ENV === "development" ? "debug" : "info" }))
  .onError(({ code, error, set, log }) => {
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
  .get("/health", () => ({ status: "ok", timestamp: new Date().toISOString() }))
  .use(authRoutes)
  .use(inboundReceiver)
  .use(webhooks)
  .use(endpoints)
  .use(inboundManagement)
  .listen(env.PORT)

app.log.info(`Von API running on port ${env.PORT}`)

export type App = typeof app