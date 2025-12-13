import { createLogger } from "@usevon/utils/logger/elysia"
import { checkRedisConnection } from "@usevon/queue"
import { checkDatabaseConnection } from "@usevon/db"
import { createWebhookWorker } from "@/processors/webhook"
import { createInboundWorker } from "@/processors/inbound"
import { env } from "@/env"

const log = createLogger({
  level: env.NODE_ENV === "development" ? "debug" : "info",
  pretty: env.NODE_ENV === "development",
})

const [redis, db] = await Promise.all([
  checkRedisConnection(),
  checkDatabaseConnection(),
])

if (!redis.ok) {
  log.error({ url: redis.url }, "Redis connection failed")
  process.exit(1)
}

if (!db.ok) {
  log.error({ url: db.url }, "Database connection failed")
  process.exit(1)
}

const webhookWorker = createWebhookWorker()
const inboundWorker = createInboundWorker()

log.info("Von Worker started")

process.on("SIGTERM", async () => {
  log.info("Shutting down worker...")
  await Promise.all([webhookWorker.close(), inboundWorker.close()])
  process.exit(0)
})

process.on("SIGINT", async () => {
  log.info("Shutting down worker...")
  await Promise.all([webhookWorker.close(), inboundWorker.close()])
  process.exit(0)
})