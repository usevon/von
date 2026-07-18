import { db } from "@usevon/db";
import { delivery, event } from "@usevon/db/schema";
import { getRedisClient } from "@usevon/queue";
import { DEFAULT_MAX_ATTEMPTS } from "@usevon/utils";
import { sql } from "drizzle-orm";
import { log } from "@/lib/logger";
import { enqueueWebhookDispatchJobs } from "@/lib/webhook-dispatch";
import type { WebhookDispatchJob } from "@/lib/webhook-dispatch";
import { EndpointService } from "@/modules/endpoints/service";

export const STREAM_KEY = "von:event-buffer";
const GROUP_NAME = "flusher";
const CONSUMER_NAME = `flusher-${crypto.randomUUID().slice(0, 8)}`;
const FLUSH_INTERVAL_MS = 10;
const FLUSH_BATCH_SIZE = 500;

let lastBacklogWarnAt = 0;

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
  plan?: string;
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
      "100000",
      "*",
      "data",
      JSON.stringify(persistence)
    ),
    jobs.length > 0 ? enqueueWebhookDispatchJobs(jobs) : undefined,
  ]);
}

// Jobs are derived here instead of riding the stream so entries stay small under endpoint fanout.
async function buildDispatchJobs(
  events: BufferedPersistence["events"],
  deliveries: BufferedPersistence["deliveries"],
  planByDeliveryId: Map<string, string>
): Promise<WebhookDispatchJob[]> {
  if (deliveries.length === 0) {
    return [];
  }

  const eventsById = new Map(events.map((e) => [e.id, e]));
  const maxAttemptsByOrgEndpoint = new Map<string, number>();
  const orgIds = new Set(deliveries.map((d) => d.organizationId));
  for (const orgId of orgIds) {
    try {
      const endpoints =
        await EndpointService.getEnabledEndpointsForDelivery(orgId);
      for (const ep of endpoints) {
        maxAttemptsByOrgEndpoint.set(`${orgId}:${ep.id}`, ep.maxAttempts);
      }
    } catch (err) {
      log.error({ err, orgId }, "Failed to load endpoints for dispatch jobs");
    }
  }

  const jobs: WebhookDispatchJob[] = [];
  for (const d of deliveries) {
    const evt = eventsById.get(d.eventId);
    if (!evt) {
      log.error(
        { deliveryId: d.id, eventId: d.eventId },
        "Buffered delivery missing its event"
      );
      continue;
    }
    jobs.push({
      name: "webhook-delivery",
      data: {
        deliveryId: d.id,
        eventId: d.eventId,
        payload: JSON.stringify(evt.payload),
        eventType: evt.eventType,
        endpointId: d.endpointId,
        maxAttempts:
          maxAttemptsByOrgEndpoint.get(`${d.organizationId}:${d.endpointId}`) ??
          DEFAULT_MAX_ATTEMPTS,
        organizationId: d.organizationId,
        plan: planByDeliveryId.get(d.id) ?? "hobby",
      },
    });
  }
  return jobs;
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

  // Full batches mean ingest is outrunning the flusher and the stream cap could start dropping acknowledged events.
  if (entries.length >= FLUSH_BATCH_SIZE && Date.now() - lastBacklogWarnAt > 5000) {
    lastBacklogWarnAt = Date.now();
    const backlog = await redis.xlen(STREAM_KEY);
    log.warn({ backlog }, "Event buffer flusher is reading full batches");
  }

  const allEvents: BufferedPersistence["events"] = [];
  const allDeliveries: BufferedPersistence["deliveries"] = [];
  const planByDeliveryId = new Map<string, string>();
  const streamIds: string[] = [];

  for (const [id, fields] of entries) {
    streamIds.push(id);
    try {
      const data = JSON.parse(fields[1]) as BufferedPersistence;
      allEvents.push(...data.events);
      allDeliveries.push(...data.deliveries);
      for (const d of data.deliveries) {
        planByDeliveryId.set(d.id, data.plan ?? "hobby");
      }
    } catch {
      log.error({ streamId: id }, "Failed to parse buffered event entry");
    }
  }

  const allJobs = await buildDispatchJobs(
    allEvents,
    allDeliveries,
    planByDeliveryId
  );

  let persisted = false;
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
      persisted = true;
    } catch (err) {
      log.error(
        { err, eventCount: allEvents.length },
        "Event buffer flush failed"
      );
    }
  }

  // Enqueue after the rows exist so a dispatch failure can mark them failed instead of racing the insert.
  if (persisted && allJobs.length > 0) {
    await enqueueWebhookDispatchJobs(allJobs);
  }

  if (streamIds.length > 0) {
    await redis.xack(STREAM_KEY, GROUP_NAME, ...streamIds);
    await redis.xdel(STREAM_KEY, ...streamIds);
  }

  return allEvents.length;
}

let flushTimer: ReturnType<typeof setInterval> | null = null;
let flushInFlight = false;

export function startEventBufferFlusher(): () => void {
  if (flushTimer) {
    return () => undefined;
  }

  ensureGroup().catch(() => undefined);

  // Skip the tick while a flush is still running so slow flushes cannot stack.
  flushTimer = setInterval(async () => {
    if (flushInFlight) {
      return;
    }
    flushInFlight = true;
    try {
      await flushBuffer();
    } catch (err) {
      log.error({ err }, "Event buffer flush tick failed");
    } finally {
      flushInFlight = false;
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
