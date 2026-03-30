import { db } from "@usevon/db";
import { delivery, deliveryAttempt, event } from "@usevon/db/schema";
import type { DeliveryEndpoint, WebhookDeliveryJob } from "@usevon/queue";
import type { DeliveryResponse, WebhookDelivery } from "@usevon/types";
import {
  BadRequestError,
  InternalServerError,
  matchesEventType,
  NotFoundError,
} from "@usevon/utils";
import { and, asc, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { env } from "@/env";
import { parseOptionalDate, validateDateRange } from "@/lib/date-utils";
import {
  releaseMonthlyQuota,
  reserveMonthlyQuota,
  withReservedMonthlyQuota,
} from "@/lib/delivery-quota";
import { bufferEvents } from "@/lib/event-buffer";
import {
  buildCursorCondition,
  buildCursorScopeHash,
  type CursorPageInput,
  type CursorSort,
  decodeCursor,
  encodeCursor,
  sliceCursorPage,
} from "@/lib/pagination";
import { enqueueWebhookDispatchJobs } from "@/lib/webhook-dispatch";
import { EndpointService } from "@/modules/endpoints/service";
import type { WebhookModel } from "@/modules/webhooks/model";

type EventRow = typeof event.$inferSelect;
type DeliveryRow = typeof delivery.$inferSelect;
type DeliveryAttemptRow = typeof deliveryAttempt.$inferSelect;

const DELIVERY_CURSOR_SORT = "desc" as const;

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
  payload: e.payload,
  idempotencyKey: e.idempotencyKey,
  createdAt: e.createdAt.toISOString(),
});

const toDeliveryAttempt = (
  row: DeliveryAttemptRow
): WebhookModel.deliveryAttempt => ({
  id: row.id,
  deliveryId: row.deliveryId,
  eventId: row.eventId,
  endpointId: row.endpointId,
  attemptNumber: row.attemptNumber,
  outcome: row.outcome,
  isFinal: row.isFinal,
  httpStatus: row.httpStatus,
  error: row.error,
  durationMs: row.durationMs,
  startedAt: row.startedAt.toISOString(),
  finishedAt: row.finishedAt.toISOString(),
  createdAt: row.createdAt.toISOString(),
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
  plan: string;
  now: Date;
};

const buildDeliveriesAndJobs = (params: BuildDeliveriesParams) => {
  const { newEvents, allEndpoints, endpointsById, organizationId, plan, now } =
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
          plan,
        },
      });
    }
  }

  return { allDeliveries, allJobs };
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
      if (JSON.stringify(evt.payload).length > env.API_MAX_BODY_BYTES) {
        throw new BadRequestError(
          `Payload exceeds ${env.API_MAX_BODY_BYTES} byte limit`
        );
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
      plan: params.plan,
      now,
    });

    await reserveMonthlyQuota(
      params.organizationId,
      params.plan,
      allDeliveries.length
    );

    // Fast path: no idempotency keys — buffer in Redis, flush async
    if (idempotencyKeys.length === 0) {
      try {
        await bufferEvents({
          events: newEvents.map((e) => ({
            id: e.id,
            organizationId: params.organizationId,
            eventType: e.eventType,
            payload: e.payload,
            idempotencyKey: e.idempotencyKey,
            createdAt: nowIso,
          })),
          deliveries: allDeliveries.map((d) => ({
            id: d.id as string,
            eventId: d.eventId as string,
            endpointId: d.endpointId as string,
            status: d.status as string,
            attempts: d.attempts as number,
            createdAt: nowIso,
          })),
          jobs: allJobs,
        });
      } catch (error) {
        await releaseMonthlyQuota(
          params.organizationId,
          allDeliveries.length
        );
        throw error;
      }

      for (const e of newEvents) {
        results.push({
          id: e.id,
          eventType: e.eventType,
          payload: e.payload,
          idempotencyKey: e.idempotencyKey,
          createdAt: nowIso,
        });
      }
      return { created: newEvents.length, events: results };
    }

    // Slow path: idempotency keys present — write to DB synchronously
    let reservedDeliveries = allDeliveries.length;
    let insertedIds = new Set<string>();

    try {
      insertedIds = await db.transaction(async (tx) => {
        await tx.execute(sql`SET LOCAL synchronous_commit = off`);

        const inserted = await tx
          .insert(event)
          .values(
            newEvents.map((e) => ({
              id: e.id,
              organizationId: params.organizationId,
              eventType: e.eventType,
              payload: e.payload,
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

      const jobsToEnqueue = allJobs.filter((j) =>
        insertedIds.has(j.data.eventId)
      );
      await Promise.all([
        overReserved > 0
          ? releaseMonthlyQuota(params.organizationId, overReserved)
          : undefined,
        enqueueWebhookDispatchJobs(jobsToEnqueue),
      ]);
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
          createdAt: nowIso,
        });
      }
    }

    return { created: insertedIds.size, events: results };
  }

  static async getEvents(
    organizationId: string,
    filters?: {
      eventTypes?: string[];
      from?: string;
      to?: string;
      sort?: "asc" | "desc";
    },
    pagination: CursorPageInput = { limit: 20, cursor: null }
  ): Promise<WebhookModel.eventList> {
    const sort: CursorSort = filters?.sort === "asc" ? "asc" : "desc";
    const from = parseOptionalDate(filters?.from, "from");
    const to = parseOptionalDate(filters?.to, "to");
    validateDateRange(from, to);

    const normalizedEventTypes = filters?.eventTypes?.length
      ? [...filters.eventTypes].sort()
      : null;

    const scopeHash = buildCursorScopeHash({
      resource: "webhook-events",
      organizationId,
      eventTypes: normalizedEventTypes,
      from: from?.toISOString() ?? null,
      to: to?.toISOString() ?? null,
      sort,
    });

    const cursorPosition = decodeCursor(pagination.cursor, {
      sort,
      scopeHash,
    });

    const conditions = [eq(event.organizationId, organizationId)];

    if (filters?.eventTypes?.length) {
      conditions.push(inArray(event.eventType, filters.eventTypes));
    }

    if (from) {
      conditions.push(gte(event.createdAt, from));
    }

    if (to) {
      conditions.push(lte(event.createdAt, to));
    }

    if (cursorPosition) {
      conditions.push(
        buildCursorCondition(event.createdAt, event.id, cursorPosition, sort)
      );
    }

    const where = and(...conditions);
    if (!where) {
      throw new InternalServerError();
    }

    const eventSort =
      sort === "asc" ? asc(event.createdAt) : desc(event.createdAt);
    const idSort = sort === "asc" ? asc(event.id) : desc(event.id);

    const rows = await db
      .select()
      .from(event)
      .where(where)
      .orderBy(eventSort, idSort)
      .limit(pagination.limit + 1);

    const { items, hasMore, lastItem } = sliceCursorPage(
      rows,
      pagination.limit
    );

    return {
      events: items.map(toEvent),
      nextCursor:
        hasMore && lastItem
          ? encodeCursor({
              createdAt: lastItem.createdAt,
              id: lastItem.id,
              sort,
              scopeHash,
            })
          : null,
    };
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
    eventId: string,
    filters?: {
      status?: string;
      endpointId?: string;
      from?: string;
      to?: string;
    },
    pagination: CursorPageInput = { limit: 20, cursor: null }
  ): Promise<WebhookModel.deliveryList> {
    const from = parseOptionalDate(filters?.from, "from");
    const to = parseOptionalDate(filters?.to, "to");
    validateDateRange(from, to);

    const scopeHash = buildCursorScopeHash({
      resource: "webhook-deliveries",
      organizationId,
      eventId,
      status: filters?.status ?? null,
      endpointId: filters?.endpointId ?? null,
      from: from?.toISOString() ?? null,
      to: to?.toISOString() ?? null,
      sort: DELIVERY_CURSOR_SORT,
    });

    const cursorPosition = decodeCursor(pagination.cursor, {
      sort: DELIVERY_CURSOR_SORT,
      scopeHash,
    });

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
    if (from) {
      conditions.push(gte(delivery.createdAt, from));
    }
    if (to) {
      conditions.push(lte(delivery.createdAt, to));
    }
    if (cursorPosition) {
      conditions.push(
        buildCursorCondition(
          delivery.createdAt,
          delivery.id,
          cursorPosition,
          DELIVERY_CURSOR_SORT
        )
      );
    }

    const where = and(...conditions);
    if (!where) {
      throw new InternalServerError();
    }

    const rows = await db
      .select({ delivery })
      .from(delivery)
      .innerJoin(event, eq(delivery.eventId, event.id))
      .where(where)
      .orderBy(desc(delivery.createdAt), desc(delivery.id))
      .limit(pagination.limit + 1);

    const { items, hasMore, lastItem } = sliceCursorPage(
      rows,
      pagination.limit
    );

    return {
      deliveries: items.map((r) => toDelivery(r.delivery)),
      nextCursor:
        hasMore && lastItem
          ? encodeCursor({
              createdAt: lastItem.delivery.createdAt,
              id: lastItem.delivery.id,
              sort: DELIVERY_CURSOR_SORT,
              scopeHash,
            })
          : null,
    };
  }

  static async getDeliveryAttempts(
    organizationId: string,
    deliveryId: string,
    pagination: CursorPageInput = { limit: 20, cursor: null },
    sortInput: "asc" | "desc" = "asc"
  ): Promise<WebhookModel.deliveryAttemptList> {
    const sort: CursorSort = sortInput === "desc" ? "desc" : "asc";

    const scopeHash = buildCursorScopeHash({
      resource: "webhook-delivery-attempts",
      organizationId,
      deliveryId,
      sort,
    });

    const cursorPosition = decodeCursor(pagination.cursor, {
      sort,
      scopeHash,
    });

    const conditions = [
      eq(deliveryAttempt.organizationId, organizationId),
      eq(deliveryAttempt.deliveryId, deliveryId),
    ];

    if (cursorPosition) {
      conditions.push(
        buildCursorCondition(
          deliveryAttempt.createdAt,
          deliveryAttempt.id,
          cursorPosition,
          sort
        )
      );
    }

    const where = and(...conditions);
    if (!where) {
      throw new InternalServerError();
    }

    const createdSort =
      sort === "asc"
        ? asc(deliveryAttempt.createdAt)
        : desc(deliveryAttempt.createdAt);
    const idSort =
      sort === "asc" ? asc(deliveryAttempt.id) : desc(deliveryAttempt.id);

    const rows = await db
      .select()
      .from(deliveryAttempt)
      .where(where)
      .orderBy(createdSort, idSort)
      .limit(pagination.limit + 1);

    const { items, hasMore, lastItem } = sliceCursorPage(
      rows,
      pagination.limit
    );

    return {
      attempts: items.map(toDeliveryAttempt),
      nextCursor:
        hasMore && lastItem
          ? encodeCursor({
              createdAt: lastItem.createdAt,
              id: lastItem.id,
              sort,
              scopeHash,
            })
          : null,
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

    return withReservedMonthlyQuota(
      organizationId,
      plan,
      targets.length,
      async () => {
        const now = new Date();
        const payloadStr = JSON.stringify(eventRecord.payload);
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
              plan,
            },
          });
        }

        await db.insert(delivery).values(deliveryRecords);
        await enqueueWebhookDispatchJobs(jobs);

        return {
          replayed: deliveryRecords.length,
          deliveryIds: deliveryRecords.map((d) => d.id as string),
        };
      }
    );
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
      .where(and(...conditions))
      .limit(1000);

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
          payload: JSON.stringify(failed.payload),
          eventType: failed.eventType,
          endpoint: ep,
          organizationId,
          plan,
        },
      });
    }

    if (deliveryRecords.length > 0) {
      await withReservedMonthlyQuota(
        organizationId,
        plan,
        deliveryRecords.length,
        async () => {
          await db.insert(delivery).values(deliveryRecords);
          await enqueueWebhookDispatchJobs(jobs);
        }
      );
    }

    return { replayed: deliveryRecords.length };
  }
}
