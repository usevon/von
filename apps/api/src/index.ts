import { Elysia } from "elysia"
import { cors } from "@elysiajs/cors"
import { serverTiming } from "@elysiajs/server-timing"

import { env } from "@von/env"
import { createLogger } from "@von/logger/elysia"

import { auth } from "@/modules/auth"
import { endpoints } from "@/modules/endpoints"
import { inbound, inboundPublic } from "@/modules/inbound"
import { webhooks } from "@/modules/webhooks"

const log = createLogger({
  level: env.NODE_ENV === "development" ? "debug" : "info",
  pretty: env.NODE_ENV === "development",
})

const app = new Elysia({
  name: "von-api",
  aot: true,
  normalize: true,
})
  .use(cors())
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
  .get("/ready", () => ({ status: "ok" }))
  .use(auth)
  .use(inboundPublic)
  .use(webhooks)
  .use(endpoints)
  .use(inbound)
  .listen(env.PORT)

log.info(`Von API running on port ${env.PORT}`)

export type App = typeof app