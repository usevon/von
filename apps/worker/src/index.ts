import { createLogger } from "@von/logger/elysia"
import { createWebhookWorker } from "@/processors/webhook"
import { env } from "@/env"

const log = createLogger({
  level: env.NODE_ENV === "development" ? "debug" : "info",
  pretty: env.NODE_ENV === "development",
})

const worker = createWebhookWorker()

log.info("Von Worker started")

process.on("SIGTERM", async () => {
  log.info("Shutting down worker...")
  await worker.close()
  process.exit(0)
})

process.on("SIGINT", async () => {
  log.info("Shutting down worker...")
  await worker.close()
  process.exit(0)
})