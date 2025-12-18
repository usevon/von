import { db } from "@usevon/db";
import { delivery, event } from "@usevon/db/schema";
import type { WebhookDeliveryJob } from "@usevon/queue";
import { getWebhookDeliveryQueue } from "@usevon/queue";
import {
  BadRequestError,
  generateId,
  InternalServerError,
  matchesEventType,
} from "@usevon/utils";
import { and, eq, inArray, sql } from "drizzle-orm";
import { EndpointService } from "@/modules/endpoints/service";
import type { WebhookModel } from "@/modules/webhooks/model";

type EventRow = typeof event.$inferSelect;
type DeliveryRow = typeof delivery.$inferSelect;

const toEvent = (e: EventRow): WebhookModel.event => ({
  id: e.id,
  eventType: e.eventType,
  payload: JSON.parse(e.payload),
  idempotencyKey: e.idempotencyKey,
  status: "pending",
  createdAt: e.createdAt.toISOString(),
});

const toDelivery = (d: DeliveryRow): WebhookModel.delivery => ({
  id: d.id,
  eventId: d.eventId,
  endpointId: d.endpointId,
  status: d.status,
  attempts: d.attempts,
  nextAttemptAt: d.nextAttemptAt?.toISOString() ?? null,
  lastAttemptAt: d.lastAttemptAt?.toISOString() ?? null,
  responseStatus: d.responseStatus,
  createdAt: d.createdAt.toISOString(),
});

type CreateEventParams = {
  organizationId: string;
  eventType: string;
  payload: unknown;
  idempotencyKey?: string;
  endpointIds?: string[];
};

type CreateBatchParams = {
  organizationId: string;
  events: Array<{
    eventType: string;
    payload: unknown;
    idempotencyKey?: string;
    endpointIds?: string[];
  }>;
};

type NewEvent = {
  id: string;
  eventType: string;
  payload: unknown;
  idempotencyKey: string | null;
  endpointIds?: string[];
};

type DeliveryEndpoint = {
  id: string;
  url: string;
  secret: string;
  timeoutMs: number;
  retryCount: number;
  version: string | null;
  events: string[] | null;
};

type BuildDeliveriesParams = {
  newEvents: NewEvent[];
  allEndpoints: DeliveryEndpoint[];
  endpointsById: Map<string, DeliveryEndpoint>;
  organizationId: string;
  now: Date;
};

const buildDeliveriesAndJobs = (params: BuildDeliveriesParams) => {
  const { newEvents, allEndpoints, endpointsById, organizationId, now } =
    params;
  const allDeliveries: (typeof delivery.$inferInsert)[] = [];
  const allJobs: Array<{ name: string; data: WebhookDeliveryJob }> = [];

  for (const evt of newEvents) {
    const candidates = evt.endpointIds?.length
      ? evt.endpointIds.flatMap((id) => endpointsById.get(id) ?? [])
      : allEndpoints;

    const targets = candidates.filter((ep) =>
      matchesEventType(evt.eventType, ep.events)
    );

    const payloadStr = JSON.stringify(evt.payload);
    for (const ep of targets) {
      const deliveryId = generateId();
      allDeliveries.push({
        id: deliveryId,
        eventId: evt.id,
        endpointId: ep.id,
        status: "pending",
        attempts: 0,
        nextAttemptAt: now,
        createdAt: now,
        updatedAt: now,
      });
      allJobs.push({
        name: "webhook-delivery",
        data: {
          deliveryId,
          eventId: evt.id,
          payload: payloadStr,
          eventType: evt.eventType,
          endpoint: ep,
          organizationId,
        },
      });
    }
  }

  return { allDeliveries, allJobs };
};

const enqueueJobs = async (
  allJobs: Array<{ name: string; data: WebhookDeliveryJob }>,
  insertedIds: Set<string>
) => {
  const jobsToEnqueue = allJobs.filter((j) => insertedIds.has(j.data.eventId));
  if (jobsToEnqueue.length === 0) {
    return;
  }

  try {
    await getWebhookDeliveryQueue().addBulk(jobsToEnqueue);
  } catch (_err) {
    const failedDeliveryIds = jobsToEnqueue.map((j) => j.data.deliveryId);
    await db
      .update(delivery)
      .set({ status: "failed", updatedAt: new Date() })
      .where(inArray(delivery.id, failedDeliveryIds));
    throw new InternalServerError("Failed to enqueue webhook deliveries");
  }
};

export abstract class WebhookService {
  private static getEventStmt = db
    .select()
    .from(event)
    .where(
      and(
        eq(event.id, sql.placeholder("eventId")),
        eq(event.organizationId, sql.placeholder("orgId"))
      )
    )
    .limit(1)
    .prepare("get_event");

  private static getDeliveriesStmt = db
    .select({ delivery })
    .from(delivery)
    .innerJoin(event, eq(delivery.eventId, event.id))
    .where(
      and(
        eq(delivery.eventId, sql.placeholder("eventId")),
        eq(event.organizationId, sql.placeholder("orgId"))
      )
    )
    .prepare("get_deliveries");

  static async createEvent(
    params: CreateEventParams
  ): Promise<WebhookModel.event> {
    const result = await WebhookService.createBatch({
      organizationId: params.organizationId,
      events: [
        {
          eventType: params.eventType,
          payload: params.payload,
          idempotencyKey: params.idempotencyKey,
          endpointIds: params.endpointIds,
        },
      ],
    });
    const created = result.events[0];
    if (!created) {
      throw new InternalServerError("Failed to create webhook event");
    }
    return created;
  }

  static async createBatch(
    params: CreateBatchParams
  ): Promise<WebhookModel.batchResult> {
    for (const evt of params.events) {
      if (JSON.stringify(evt.payload).length > 1_000_000) {
        throw new BadRequestError("Payload exceeds 1MB limit");
      }
    }

    const now = new Date();
    const nowIso = now.toISOString();
    const idempotencyKeys = params.events
      .map((e) => e.idempotencyKey)
      .filter((k): k is string => !!k);

    const [existingEvents, allEndpoints] = await Promise.all([
      idempotencyKeys.length > 0
        ? db
            .select()
            .from(event)
            .where(
              and(
                eq(event.organizationId, params.organizationId),
                inArray(event.idempotencyKey, idempotencyKeys)
              )
            )
        : [],
      EndpointService.getEnabledEndpointsForDelivery(params.organizationId),
    ]);

    const existingByKey = new Map(
      existingEvents.flatMap((e) =>
        e.idempotencyKey ? [[e.idempotencyKey, e] as const] : []
      )
    );
    const endpointsById = new Map(allEndpoints.map((ep) => [ep.id, ep]));

    const results: WebhookModel.event[] = [];
    const newEvents: NewEvent[] = [];

    for (const evt of params.events) {
      const existing = evt.idempotencyKey
        ? existingByKey.get(evt.idempotencyKey)
        : undefined;
      if (existing) {
        results.push(toEvent(existing));
        continue;
      }
      newEvents.push({
        id: generateId(),
        eventType: evt.eventType,
        payload: evt.payload,
        idempotencyKey: evt.idempotencyKey ?? null,
        endpointIds: evt.endpointIds,
      });
    }

    if (newEvents.length === 0) {
      return { created: 0, events: results };
    }

    const { allDeliveries, allJobs } = buildDeliveriesAndJobs({
      newEvents,
      allEndpoints,
      endpointsById,
      organizationId: params.organizationId,
      now,
    });

    const insertedIds = await db.transaction(async (tx) => {
      const inserted = await tx
        .insert(event)
        .values(
          newEvents.map((e) => ({
            id: e.id,
            organizationId: params.organizationId,
            eventType: e.eventType,
            payload: JSON.stringify(e.payload),
            idempotencyKey: e.idempotencyKey,
            createdAt: now,
          }))
        )
        .onConflictDoNothing({
          target: [event.organizationId, event.idempotencyKey],
        })
        .returning({ id: event.id });

      const insertedIdSet = new Set(inserted.map((e) => e.id));
      const deliveriesToInsert = allDeliveries.filter((d) =>
        insertedIdSet.has(d.eventId)
      );
      if (deliveriesToInsert.length > 0) {
        await tx.insert(delivery).values(deliveriesToInsert);
      }
      return insertedIdSet;
    });

    await enqueueJobs(allJobs, insertedIds);

    for (const e of newEvents) {
      if (insertedIds.has(e.id)) {
        results.push({
          id: e.id,
          eventType: e.eventType,
          payload: e.payload,
          idempotencyKey: e.idempotencyKey,
          status: "pending",
          createdAt: nowIso,
        });
      }
    }

    return { created: insertedIds.size, events: results };
  }

  static async getEvents(
    organizationId: string,
    limit: number,
    offset: number
  ): Promise<WebhookModel.eventList> {
    const [events, total] = await Promise.all([
      db
        .select()
        .from(event)
        .where(eq(event.organizationId, organizationId))
        .orderBy(event.createdAt)
        .limit(limit)
        .offset(offset),
      db.$count(event, eq(event.organizationId, organizationId)),
    ]);
    return { events: events.map(toEvent), total };
  }

  static async getEvent(
    organizationId: string,
    eventId: string
  ): Promise<WebhookModel.event | null> {
    const [result] = await WebhookService.getEventStmt.execute({
      eventId,
      orgId: organizationId,
    });
    return result ? toEvent(result) : null;
  }

  static async getDeliveries(
    organizationId: string,
    eventId: string
  ): Promise<WebhookModel.delivery[]> {
    const rows = await WebhookService.getDeliveriesStmt.execute({
      eventId,
      orgId: organizationId,
    });
    return rows.map((r) => toDelivery(r.delivery));
  }
}
