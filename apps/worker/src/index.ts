import { checkDatabaseConnection } from "@usevon/db";
import { checkRedisConnection } from "@usevon/queue";
import { startAutoDisable } from "@/lib/auto-disable";
import { log } from "@/lib/logger";
import { startRetentionCleanup } from "@/lib/retention";
import { createInboundWorker } from "@/processors/inbound";
import { createWebhookWorker } from "@/processors/webhook";

const CONNECTION_AUTH_REGEX = /\/\/[^@/]+@/;

const redactConnectionUrl = (url: string): string => {
  try {
    const parsed = new URL(url);
    if (!(parsed.username || parsed.password)) {
      return parsed.toString();
    }

    parsed.username = "***";
    parsed.password = parsed.password ? "***" : "";
    return parsed.toString();
  } catch {
    return url.replace(CONNECTION_AUTH_REGEX, "//***@");
  }
};

const [redis, db] = await Promise.all([
  checkRedisConnection(),
  checkDatabaseConnection(),
]);

if (!redis.ok) {
  log.error({ url: redactConnectionUrl(redis.url) }, "Redis connection failed");
  process.exit(1);
}

if (!db.ok) {
  log.error("Database connection failed");
  process.exit(1);
}

const webhookWorker = createWebhookWorker();
const inboundWorker = createInboundWorker();
const stopRetentionCleanup = startRetentionCleanup();
const stopAutoDisable = startAutoDisable();

log.info("Von Worker started");

const shutdown = async () => {
  log.info("Shutting down worker...");
  stopRetentionCleanup();
  stopAutoDisable();
  await Promise.all([webhookWorker.close(), inboundWorker.close()]);
  process.exit(0);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
