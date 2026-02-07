import { checkDatabaseConnection } from "@usevon/db";
import { checkRedisConnection } from "@usevon/queue";
import { log } from "@/lib/logger";
import { createInboundWorker } from "@/processors/inbound";
import { createWebhookWorker } from "@/processors/webhook";

const [redis, db] = await Promise.all([
  checkRedisConnection(),
  checkDatabaseConnection(),
]);

if (!redis.ok) {
  log.error({ url: redis.url }, "Redis connection failed");
  process.exit(1);
}

if (!db.ok) {
  log.error("Database connection failed");
  process.exit(1);
}

const webhookWorker = createWebhookWorker();
const inboundWorker = createInboundWorker();

log.info("Von Worker started");

const shutdown = async () => {
  log.info("Shutting down worker...");
  await Promise.all([webhookWorker.close(), inboundWorker.close()]);
  process.exit(0);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
