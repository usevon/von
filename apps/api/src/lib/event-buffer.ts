import { db } from "@usevon/db";
import { delivery, event } from "@usevon/db/schema";
import { getRedisClient } from "@usevon/queue";
import { sql } from "drizzle-orm";
import { log } from "@/lib/logger";
import { enqueueWebhookDispatchJobs } from "@/lib/webhook-dispatch";

const STREAM_KEY = "von:event-buffer";
const FLUSH_INTERVAL_MS = 50;
const FLUSH_BATCH_SIZE = 200;

type BufferedEntry = {
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
    eventId: string;
    endpointId: string;
    status: string;
    attempts: number;
    createdAt: string;
  }>;
  jobs: Array<{
    name: string;
    data: Record<string, unknown>;
  }>;
};

export async function bufferEvents(entry: BufferedEntry): Promise<void> {
  const redis = getRedisClient();
  await redis.xadd(
    STREAM_KEY,
    "MAXLEN",
    "~",
    "10000",
    "*",
    "data",
    JSON.stringify(entry)
  );
}

async function flushBuffer(): Promise<number> {
  const redis = getRedisClient();

  const entries = await redis.xrange(
    STREAM_KEY,
    "-",
    "+",
    "COUNT",
    String(FLUSH_BATCH_SIZE)
  );

  if (!entries || entries.length === 0) {
    return 0;
  }

  const allEvents: BufferedEntry["events"] = [];
  const allDeliveries: BufferedEntry["deliveries"] = [];
  const allJobs: BufferedEntry["jobs"] = [];
  const streamIds: string[] = [];

  for (const [id, fields] of entries) {
    streamIds.push(id);
    try {
      const data = JSON.parse(fields[1]) as BufferedEntry;
      allEvents.push(...data.events);
      allDeliveries.push(...data.deliveries);
      allJobs.push(...data.jobs);
    } catch {
      log.error({ streamId: id }, "Failed to parse buffered event entry");
    }
  }

  if (allEvents.length > 0) {
    try {
      await db.transaction(async (tx) => {
        await tx.execute(sql`SET LOCAL synchronous_commit = off`);

        await tx.insert(event).values(
          allEvents.map((e) => ({
            id: e.id,
            organizationId: e.organizationId,
            eventType: e.eventType,
            payload: e.payload,
            idempotencyKey: e.idempotencyKey,
            createdAt: new Date(e.createdAt),
          }))
        ).onConflictDoNothing({
          target: [event.organizationId, event.idempotencyKey],
        });

        if (allDeliveries.length > 0) {
          await tx.insert(delivery).values(
            allDeliveries.map((d) => ({
              id: d.id,
              eventId: d.eventId,
              endpointId: d.endpointId,
              status: d.status,
              attempts: d.attempts,
              createdAt: new Date(d.createdAt),
            }))
          );
        }
      });

      if (allJobs.length > 0) {
        await enqueueWebhookDispatchJobs(
          allJobs as Array<{ name: string; data: Record<string, unknown> }>
        );
      }
    } catch (err) {
      log.error({ err, eventCount: allEvents.length }, "Event buffer flush failed");
    }
  }

  if (streamIds.length > 0) {
    await redis.xdel(STREAM_KEY, ...streamIds);
  }

  return allEvents.length;
}

let flushTimer: ReturnType<typeof setInterval> | null = null;

export function startEventBufferFlusher(): () => void {
  if (flushTimer) {
    return () => undefined;
  }

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
