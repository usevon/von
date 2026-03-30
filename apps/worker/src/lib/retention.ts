import { db, lt, sql } from "@usevon/db";
import {
  delivery,
  deliveryAttempt,
  event,
  inboundDelivery,
} from "@usevon/db/schema";
import type { PgTable } from "drizzle-orm/pg-core";
import { MS_PER_DAY } from "@usevon/utils";
import { env } from "@/env";
import { log } from "@/lib/logger";

const BATCH_SIZE = 5000;

const getCutoff = (days: number) => new Date(Date.now() - days * MS_PER_DAY);

async function batchDelete(
  table: PgTable & { createdAt: any },
  cutoff: Date
): Promise<number> {
  let totalDeleted = 0;
  let deleted: number;
  do {
    const result = await db.execute<{ count: string }>(
      sql`DELETE FROM ${table} WHERE ctid IN (
        SELECT ctid FROM ${table}
        WHERE ${table.createdAt} < ${cutoff}
        LIMIT ${BATCH_SIZE}
      )`
    );
    deleted = result.length;
    totalDeleted += deleted;
  } while (deleted >= BATCH_SIZE);
  return totalDeleted;
}

const runRetentionCleanup = async () => {
  const deliveryCutoff = getCutoff(env.DELIVERY_RETENTION_DAYS);
  const eventCutoff = getCutoff(env.EVENT_RETENTION_DAYS);
  const inboundDeliveryCutoff = getCutoff(env.INBOUND_DELIVERY_RETENTION_DAYS);

  try {
    await Promise.all([
      batchDelete(inboundDelivery, inboundDeliveryCutoff),
      batchDelete(deliveryAttempt, deliveryCutoff),
      batchDelete(delivery, deliveryCutoff),
      batchDelete(event, eventCutoff),
    ]);

    log.debug(
      {
        deliveryRetentionDays: env.DELIVERY_RETENTION_DAYS,
        eventRetentionDays: env.EVENT_RETENTION_DAYS,
        inboundDeliveryRetentionDays: env.INBOUND_DELIVERY_RETENTION_DAYS,
      },
      "Retention cleanup completed"
    );
  } catch (error) {
    const cause =
      error instanceof Error
        ? (error as { cause?: { code?: string } }).cause
        : undefined;
    if (cause?.code === "42P01") {
      log.warn("Retention cleanup skipped, tables do not exist yet");
    } else {
      log.error({ error }, "Retention cleanup failed");
    }
  }
};

export const startRetentionCleanup = () => {
  if (!env.RETENTION_CLEANUP_ENABLED) {
    log.info("Retention cleanup disabled");
    return () => undefined;
  }

  runRetentionCleanup();

  const timer = setInterval(() => {
    runRetentionCleanup();
  }, env.RETENTION_CLEANUP_INTERVAL_MS);

  timer.unref?.();

  return () => {
    clearInterval(timer);
  };
};
