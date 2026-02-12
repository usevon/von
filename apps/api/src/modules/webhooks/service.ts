import { db } from "@usevon/db";
import { delivery, event } from "@usevon/db/schema";
import {
  type DeliveryEndpoint,
  getWebhookDeliveryQueue,
  type WebhookDeliveryJob,
} from "@usevon/queue";
import type { DeliveryResponse, WebhookDelivery } from "@usevon/types";
import {
  BadRequestError,
  InternalServerError,
  matchesEventType,
  NotFoundError,
} from "@usevon/utils";
import { and, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { releaseMonthlyQuota, reserveMonthlyQuota } from "@/lib/delivery-quota";
import { EndpointService } from "@/modules/endpoints/service";
import type { WebhookModel } from "@/modules/webhooks/model";

type EventRow = typeof event.$inferSelect;
type DeliveryRow = typeof delivery.$inferSelect;

const toDelivery = (row: DeliveryRow): WebhookDelivery => ({
  id: row.id,
  eventId: row.eventId,
  endpointId: row.endpointId,
  status: row.status,
  attempts: row.attempts,
  lastAttemptAt: row.lastAttemptAt?.toISOString() ?? null,
  response: (row.response as DeliveryResponse) ?? null,
  createdAt: row.createdAt.toISOString(),
});

const toEvent = (e: EventRow): WebhookModel.event => ({
  id: e.id,
  eventType: e.eventType,
  payload: JSON.parse(e.payload),
  idempotencyKey: e.idempotencyKey,
  status: "pending",
  createdAt: e.createdAt.toISOString(),
});

type CreateEventParams = {
  organizationId: string;
  plan: string;
  eventType: string;
  payload: unknown;
  idempotencyKey?: string;
  endpointIds?: string[];
};

type CreateBatchParams = {
  organizationId: string;
  plan: string;
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
      const deliveryId = crypto.randomUUID();
      allDeliveries.push({
        id: deliveryId,
        eventId: evt.id,
        endpointId: ep.id,
        status: "pending",
        attempts: 0,
        createdAt: now,
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
      .set({ status: "failed" })
      .where(inArray(delivery.id, failedDeliveryIds));
    throw new InternalServerError();
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

  static async createEvent(
    params: CreateEventParams
  ): Promise<WebhookModel.event> {
    const result = await WebhookService.createBatch({
      organizationId: params.organizationId,
      plan: params.plan,
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
      throw new InternalServerError();
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
        id: crypto.randomUUID(),
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

    await reserveMonthlyQuota(
      params.organizationId,
      params.plan,
      allDeliveries.length
    );

    let reservedDeliveries = allDeliveries.length;
    let insertedIds = new Set<string>();

    try {
      insertedIds = await db.transaction(async (tx) => {
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

      const insertedDeliveryCount = allDeliveries.filter((d) =>
        insertedIds.has(d.eventId)
      ).length;
      const overReserved = reservedDeliveries - insertedDeliveryCount;
      if (overReserved > 0) {
        await releaseMonthlyQuota(params.organizationId, overReserved);
        reservedDeliveries = insertedDeliveryCount;
      }

      await enqueueJobs(allJobs, insertedIds);
      reservedDeliveries = 0;
    } catch (error) {
      if (reservedDeliveries > 0) {
        await releaseMonthlyQuota(params.organizationId, reservedDeliveries);
      }
      throw error;
    }

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

  // biome-ignore lint/nursery/useMaxParams: parameters are all distinct query concerns
  static async getDeliveries(
    organizationId: string,
    eventId: string,
    filters?: {
      status?: string;
      endpointId?: string;
      from?: string;
      to?: string;
    },
    limit = 20,
    offset = 0
  ): Promise<{ deliveries: WebhookDelivery[]; total: number }> {
    const conditions = [
      eq(delivery.eventId, eventId),
      eq(event.organizationId, organizationId),
    ];

    if (filters?.status) {
      conditions.push(eq(delivery.status, filters.status));
    }
    if (filters?.endpointId) {
      conditions.push(eq(delivery.endpointId, filters.endpointId));
    }
    if (filters?.from) {
      conditions.push(gte(delivery.createdAt, new Date(filters.from)));
    }
    if (filters?.to) {
      conditions.push(lte(delivery.createdAt, new Date(filters.to)));
    }

    const where = and(...conditions);

    const [rows, total] = await Promise.all([
      db
        .select({ delivery })
        .from(delivery)
        .innerJoin(event, eq(delivery.eventId, event.id))
        .where(where)
        .limit(limit)
        .offset(offset),
      db.$count(
        db
          .select({ id: delivery.id })
          .from(delivery)
          .innerJoin(event, eq(delivery.eventId, event.id))
          .where(where)
          .as("filtered")
      ),
    ]);

    return {
      deliveries: rows.map((r) => toDelivery(r.delivery)),
      total,
    };
  }

  static async replayEvent(
    organizationId: string,
    eventId: string,
    plan: string,
    endpointIds?: string[]
  ): Promise<WebhookModel.replayResult> {
    const [eventRecord] = await WebhookService.getEventStmt.execute({
      eventId,
      orgId: organizationId,
    });

    if (!eventRecord) {
      throw new NotFoundError();
    }

    const allEndpoints = await EndpointService.getEnabledEndpointsForDelivery(
      organizationId,
      endpointIds
    );

    const targets = allEndpoints.filter((ep) =>
      matchesEventType(eventRecord.eventType, ep.events)
    );

    if (targets.length === 0) {
      return { replayed: 0, deliveryIds: [] };
    }

    await reserveMonthlyQuota(organizationId, plan, targets.length);
    let releaseQuota = true;

    try {
      const now = new Date();
      const payloadStr = eventRecord.payload;
      const deliveryRecords: (typeof delivery.$inferInsert)[] = [];
      const jobs: Array<{ name: string; data: WebhookDeliveryJob }> = [];

      for (const ep of targets) {
        const deliveryId = crypto.randomUUID();
        deliveryRecords.push({
          id: deliveryId,
          eventId: eventRecord.id,
          endpointId: ep.id,
          status: "pending",
          attempts: 0,
          createdAt: now,
        });
        jobs.push({
          name: "webhook-delivery",
          data: {
            deliveryId,
            eventId: eventRecord.id,
            payload: payloadStr,
            eventType: eventRecord.eventType,
            endpoint: ep,
            organizationId,
          },
        });
      }

      await db.insert(delivery).values(deliveryRecords);
      try {
        await getWebhookDeliveryQueue().addBulk(jobs);
      } catch {
        await db
          .update(delivery)
          .set({ status: "failed" })
          .where(
            inArray(
              delivery.id,
              deliveryRecords.map((d) => d.id as string)
            )
          );
        throw new InternalServerError();
      }

      releaseQuota = false;
      return {
        replayed: deliveryRecords.length,
        deliveryIds: deliveryRecords.map((d) => d.id as string),
      };
    } finally {
      if (releaseQuota) {
        await releaseMonthlyQuota(organizationId, targets.length);
      }
    }
  }

  static async replayBulk(
    organizationId: string,
    since: string,
    plan: string,
    filters?: { status?: string; endpointId?: string }
  ): Promise<WebhookModel.bulkReplayResult> {
    const conditions = [
      eq(event.organizationId, organizationId),
      gte(delivery.createdAt, new Date(since)),
      eq(delivery.status, filters?.status ?? "failed"),
    ];

    if (filters?.endpointId) {
      conditions.push(eq(delivery.endpointId, filters.endpointId));
    }

    const failedDeliveries = await db
      .select({
        eventId: delivery.eventId,
        endpointId: delivery.endpointId,
        eventType: event.eventType,
        payload: event.payload,
      })
      .from(delivery)
      .innerJoin(event, eq(delivery.eventId, event.id))
      .where(and(...conditions));

    if (failedDeliveries.length === 0) {
      return { replayed: 0 };
    }

    const endpointIdsSet = new Set(failedDeliveries.map((d) => d.endpointId));
    const allEndpoints = await EndpointService.getEnabledEndpointsForDelivery(
      organizationId,
      [...endpointIdsSet]
    );
    const activeEndpoints = new Map(allEndpoints.map((ep) => [ep.id, ep]));

    const now = new Date();
    const deliveryRecords: (typeof delivery.$inferInsert)[] = [];
    const jobs: Array<{ name: string; data: WebhookDeliveryJob }> = [];

    for (const failed of failedDeliveries) {
      const ep = activeEndpoints.get(failed.endpointId);
      if (!ep) {
        continue;
      }

      const deliveryId = crypto.randomUUID();
      deliveryRecords.push({
        id: deliveryId,
        eventId: failed.eventId,
        endpointId: failed.endpointId,
        status: "pending",
        attempts: 0,
        createdAt: now,
      });
      jobs.push({
        name: "webhook-delivery",
        data: {
          deliveryId,
          eventId: failed.eventId,
          payload: failed.payload,
          eventType: failed.eventType,
          endpoint: ep,
          organizationId,
        },
      });
    }

    if (deliveryRecords.length > 0) {
      await reserveMonthlyQuota(organizationId, plan, deliveryRecords.length);
      let releaseQuota = true;

      try {
        await db.insert(delivery).values(deliveryRecords);
        try {
          await getWebhookDeliveryQueue().addBulk(jobs);
        } catch {
          await db
            .update(delivery)
            .set({ status: "failed" })
            .where(
              inArray(
                delivery.id,
                deliveryRecords.map((d) => d.id as string)
              )
            );
          throw new InternalServerError();
        }

        releaseQuota = false;
      } finally {
        if (releaseQuota) {
          await releaseMonthlyQuota(organizationId, deliveryRecords.length);
        }
      }
    }

    return { replayed: deliveryRecords.length };
  }
}
