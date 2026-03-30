import { db } from "@usevon/db";
import { delivery, event } from "@usevon/db/schema";
import { getRedisClient } from "@usevon/queue";
import { sql } from "drizzle-orm";
import { log } from "@/lib/logger";
import { enqueueWebhookDispatchJobs } from "@/lib/webhook-dispatch";
import type { WebhookDispatchJob } from "@/lib/webhook-dispatch";

const STREAM_KEY = "von:event-buffer";
const GROUP_NAME = "flusher";
const CONSUMER_NAME = `flusher-${crypto.randomUUID().slice(0, 8)}`;
const FLUSH_INTERVAL_MS = 10;
const FLUSH_BATCH_SIZE = 500;

type BufferedPersistence = {
  events: Array<{
    id: string;
    organizationId: string;
    eventType: string;
    payload: unknown;
    idempotencyKey: string | null;
    createdAt: string;
  }>;
  deliveries: Array<{
    id: string;
    organizationId: string;
    eventId: string;
    endpointId: string;
    status: string;
    attempts: number;
    createdAt: string;
  }>;
};

/**
 * Buffer event and delivery rows in Redis for async DB persistence,
 * and immediately enqueue delivery jobs so the worker starts right away.
 */
export async function bufferEvents(
  persistence: BufferedPersistence,
  jobs: WebhookDispatchJob[]
): Promise<void> {
  const redis = getRedisClient();

  await Promise.all([
    redis.xadd(
      STREAM_KEY,
      "MAXLEN",
      "~",
      "10000",
      "*",
      "data",
      JSON.stringify(persistence)
    ),
    jobs.length > 0 ? enqueueWebhookDispatchJobs(jobs) : undefined,
  ]);
}

async function ensureGroup(): Promise<void> {
  try {
    await getRedisClient().xgroup(
      "CREATE",
      STREAM_KEY,
      GROUP_NAME,
      "0",
      "MKSTREAM"
    );
  } catch {
    // group already exists
  }
}

async function flushBuffer(): Promise<number> {
  const redis = getRedisClient();

  const results = await redis.xreadgroup(
    "GROUP",
    GROUP_NAME,
    CONSUMER_NAME,
    "COUNT",
    String(FLUSH_BATCH_SIZE),
    "STREAMS",
    STREAM_KEY,
    ">"
  );

  const entries = results?.[0]?.[1];
  if (!entries || entries.length === 0) {
    return 0;
  }

  const allEvents: BufferedPersistence["events"] = [];
  const allDeliveries: BufferedPersistence["deliveries"] = [];
  const streamIds: string[] = [];

  for (const [id, fields] of entries) {
    streamIds.push(id);
    try {
      const data = JSON.parse(fields[1]) as BufferedPersistence;
      allEvents.push(...data.events);
      allDeliveries.push(...data.deliveries);
    } catch {
      log.error({ streamId: id }, "Failed to parse buffered event entry");
    }
  }

  if (allEvents.length > 0) {
    try {
      await db.transaction(async (tx) => {
        await tx.execute(sql`SET LOCAL synchronous_commit = off`);

        await tx
          .insert(event)
          .values(
            allEvents.map((e) => ({
              id: e.id,
              organizationId: e.organizationId,
              eventType: e.eventType,
              payload: e.payload,
              idempotencyKey: e.idempotencyKey,
              createdAt: new Date(e.createdAt),
            }))
          )
          .onConflictDoNothing({
            target: [event.organizationId, event.idempotencyKey],
          });

        if (allDeliveries.length > 0) {
          await tx.insert(delivery).values(
            allDeliveries.map((d) => ({
              id: d.id,
              organizationId: d.organizationId,
              eventId: d.eventId,
              endpointId: d.endpointId,
              status: d.status,
              attempts: d.attempts,
              createdAt: new Date(d.createdAt),
            }))
          );
        }
      });
    } catch (err) {
      log.error(
        { err, eventCount: allEvents.length },
        "Event buffer flush failed"
      );
    }
  }

  if (streamIds.length > 0) {
    await redis.xack(STREAM_KEY, GROUP_NAME, ...streamIds);
    await redis.xdel(STREAM_KEY, ...streamIds);
  }

  return allEvents.length;
}

let flushTimer: ReturnType<typeof setInterval> | null = null;

export function startEventBufferFlusher(): () => void {
  if (flushTimer) {
    return () => undefined;
  }

  ensureGroup().catch(() => undefined);

  flushTimer = setInterval(async () => {
    try {
      await flushBuffer();
    } catch (err) {
      log.error({ err }, "Event buffer flush tick failed");
    }
  }, FLUSH_INTERVAL_MS);

  flushTimer.unref?.();

  return () => {
    if (flushTimer) {
      clearInterval(flushTimer);
      flushTimer = null;
    }
  };
}
