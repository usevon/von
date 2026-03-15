import { db, lt } from "@usevon/db";
import {
  delivery,
  deliveryAttempt,
  event,
  inboundDelivery,
} from "@usevon/db/schema";
import { MS_PER_DAY } from "@usevon/utils";
import { env } from "@/env";
import { log } from "@/lib/logger";

const getCutoff = (days: number) => new Date(Date.now() - days * MS_PER_DAY);

const runRetentionCleanup = async () => {
  const deliveryCutoff = getCutoff(env.DELIVERY_RETENTION_DAYS);
  const eventCutoff = getCutoff(env.EVENT_RETENTION_DAYS);
  const inboundDeliveryCutoff = getCutoff(env.INBOUND_DELIVERY_RETENTION_DAYS);

  try {
    await Promise.all([
      db
        .delete(inboundDelivery)
        .where(lt(inboundDelivery.createdAt, inboundDeliveryCutoff)),
      db
        .delete(deliveryAttempt)
        .where(lt(deliveryAttempt.createdAt, deliveryCutoff)),
      db.delete(delivery).where(lt(delivery.createdAt, deliveryCutoff)),
      db.delete(event).where(lt(event.createdAt, eventCutoff)),
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
