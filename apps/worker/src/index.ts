import { createLogger } from "@von/logger/elysia"
import { createWebhookWorker } from "@/processors/webhook"

const log = createLogger({ level: "info" })

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