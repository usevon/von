import { Elysia, t, type Static } from "elysia"
import { eq, and, count, inArray } from "drizzle-orm"
import { db } from "@von/db"
import { event, delivery } from "@von/db/schema"
import { getWebhookDeliveryQueue } from "@von/queue"
import { IdParam, PaginationQuery, ErrorResponse } from "@/lib/models"
import { withApiKey } from "@/modules/auth"
import { EndpointService } from "@/modules/endpoints"

export const SendWebhookBody = t.Object({
  eventType: t.String(),
  payload: t.Unknown(),
  idempotencyKey: t.Optional(t.String()),
  endpointIds: t.Optional(t.Array(t.String({ format: "uuid" }))),
})

export const SendWebhookBatchBody = t.Object({
  events: t.Array(t.Object({
    eventType: t.String(),
    payload: t.Unknown(),
    idempotencyKey: t.Optional(t.String()),
    endpointIds: t.Optional(t.Array(t.String({ format: "uuid" }))),
  })),
})

export const WebhookEvent = t.Object({
  id: t.String({ format: "uuid" }),
  eventType: t.String(),
  payload: t.Unknown(),
  idempotencyKey: t.Union([t.String(), t.Null()]),
  status: t.String(),
  createdAt: t.String(),
})

export const WebhookEventList = t.Object({
  events: t.Array(WebhookEvent),
  total: t.Number(),
})

export const WebhookBatchResult = t.Object({
  created: t.Number(),
  events: t.Array(WebhookEvent),
})

export const Delivery = t.Object({
  id: t.String({ format: "uuid" }),
  eventId: t.String({ format: "uuid" }),
  endpointId: t.String({ format: "uuid" }),
  status: t.String(),
  attempts: t.Number(),
  nextAttemptAt: t.Union([t.String(), t.Null()]),
  lastAttemptAt: t.Union([t.String(), t.Null()]),
  responseStatus: t.Union([t.Number(), t.Null()]),
  createdAt: t.String(),
})

export type SendWebhookBodyType = Static<typeof SendWebhookBody>
export type WebhookEventType = Static<typeof WebhookEvent>
export type DeliveryType = Static<typeof Delivery>

type CreateEventParams = {
  organizationId: string
  eventType: string
  payload: unknown
  idempotencyKey?: string
  endpointIds?: string[]
}

type CreateBatchParams = {
  organizationId: string
  events: Array<{
    eventType: string
    payload: unknown
    idempotencyKey?: string
    endpointIds?: string[]
  }>
}

type GetEventsParams = {
  organizationId: string
  limit: number
  offset: number
}

const WebhookService = {
  async createEvent(params: CreateEventParams) {
    const now = new Date()

    if (params.idempotencyKey) {
      const existing = await db
        .select()
        .from(event)
        .where(
          and(
            eq(event.organizationId, params.organizationId),
            eq(event.idempotencyKey, params.idempotencyKey)
          )
        )
        .limit(1)

      if (existing[0]) {
        return {
          ...existing[0],
          payload: JSON.parse(existing[0].payload),
          status: "pending" as const,
        }
      }
    }

    const payloadStr = JSON.stringify(params.payload)
    const eventId = crypto.randomUUID()

    const targetEndpoints = await EndpointService.getEnabledEndpointsForDelivery(
      params.organizationId,
      params.endpointIds
    )

    const deliveryData = targetEndpoints.map((ep) => ({
      id: crypto.randomUUID(),
      eventId,
      endpointId: ep.id,
      status: "pending",
      attempts: 0,
      nextAttemptAt: now,
      createdAt: now,
      updatedAt: now,
    }))

    const result = await db
      .insert(event)
      .values({
        id: eventId,
        organizationId: params.organizationId,
        eventType: params.eventType,
        payload: payloadStr,
        idempotencyKey: params.idempotencyKey ?? null,
        createdAt: now,
      })
      .returning()

    if (!result[0]) throw new Error("Failed to create event")
    const newEvent = result[0]

    if (targetEndpoints.length > 0) {
      const queue = getWebhookDeliveryQueue()
      const jobs = deliveryData.map((d, i) => {
        const endpoint = targetEndpoints[i]
        if (!endpoint) throw new Error("Endpoint not found for delivery")
        return {
          name: "webhook-delivery",
          data: {
            deliveryId: d.id,
            eventId,
            payload: payloadStr,
            eventType: params.eventType,
            endpoint,
          },
        }
      })

      await Promise.all([
        db.insert(delivery).values(deliveryData),
        queue.addBulk(jobs),
      ])
    }

    return {
      ...newEvent,
      payload: JSON.parse(newEvent.payload),
      status: "pending" as const,
    }
  },

  async createBatch(params: CreateBatchParams) {
    const now = new Date()
    const results: WebhookEventType[] = []
    const newEvents: Array<{
      id: string
      organizationId: string
      eventType: string
      payload: string
      idempotencyKey: string | null
      createdAt: Date
      endpointIds?: string[]
    }> = []

    const idempotencyKeys = params.events
      .filter((e) => e.idempotencyKey)
      .map((e) => e.idempotencyKey!)

    let existingByKey = new Map<string, typeof event.$inferSelect>()
    if (idempotencyKeys.length > 0) {
      const existing = await db
        .select()
        .from(event)
        .where(
          and(
            eq(event.organizationId, params.organizationId),
            inArray(event.idempotencyKey, idempotencyKeys)
          )
        )
      for (const e of existing) {
        if (e.idempotencyKey) {
          existingByKey.set(e.idempotencyKey, e)
        }
      }
    }

    for (const evt of params.events) {
      if (evt.idempotencyKey && existingByKey.has(evt.idempotencyKey)) {
        const existing = existingByKey.get(evt.idempotencyKey)
        if (!existing) continue
        results.push({
          ...existing,
          payload: JSON.parse(existing.payload),
          status: "pending" as const,
        })
        continue
      }

      newEvents.push({
        id: crypto.randomUUID(),
        organizationId: params.organizationId,
        eventType: evt.eventType,
        payload: JSON.stringify(evt.payload),
        idempotencyKey: evt.idempotencyKey ?? null,
        createdAt: now,
        endpointIds: evt.endpointIds,
      })
    }

    if (newEvents.length === 0) {
      return { created: 0, events: results }
    }

    const allEndpoints = await EndpointService.getEnabledEndpointsForDelivery(params.organizationId)

    const insertedEvents = await db
      .insert(event)
      .values(newEvents.map((e) => ({
        id: e.id,
        organizationId: e.organizationId,
        eventType: e.eventType,
        payload: e.payload,
        idempotencyKey: e.idempotencyKey,
        createdAt: e.createdAt,
      })))
      .returning()

    const allDeliveries: Array<{
      id: string
      eventId: string
      endpointId: string
      status: string
      attempts: number
      nextAttemptAt: Date
      createdAt: Date
      updatedAt: Date
    }> = []

    const allJobs: Array<{
      name: string
      data: {
        deliveryId: string
        eventId: string
        payload: string
        eventType: string
        endpoint: { id: string; url: string; secret: string; timeoutMs: number; retryCount: number }
      }
    }> = []

    for (let i = 0; i < insertedEvents.length; i++) {
      const inserted = insertedEvents[i]
      const original = newEvents[i]
      if (!inserted || !original) continue

      let targetEndpoints = allEndpoints
      if (original.endpointIds && original.endpointIds.length > 0) {
        targetEndpoints = allEndpoints.filter((ep) => original.endpointIds && original.endpointIds.includes(ep.id))
      }

      for (const ep of targetEndpoints) {
        const deliveryId = crypto.randomUUID()
        allDeliveries.push({
          id: deliveryId,
          eventId: inserted.id,
          endpointId: ep.id,
          status: "pending",
          attempts: 0,
          nextAttemptAt: now,
          createdAt: now,
          updatedAt: now,
        })
        allJobs.push({
          name: "webhook-delivery",
          data: {
            deliveryId,
            eventId: inserted.id,
            payload: original.payload,
            eventType: inserted.eventType,
            endpoint: ep,
          },
        })
      }

      results.push({
        ...inserted,
        payload: JSON.parse(original.payload),
        status: "pending" as const,
      })
    }

    if (allDeliveries.length > 0) {
      const queue = getWebhookDeliveryQueue()
      await Promise.all([
        db.insert(delivery).values(allDeliveries),
        queue.addBulk(allJobs),
      ])
    }

    return { created: newEvents.length, events: results }
  },

  async getEvents(params: GetEventsParams) {
    const [events, totalResult] = await Promise.all([
      db
        .select()
        .from(event)
        .where(eq(event.organizationId, params.organizationId))
        .limit(params.limit)
        .offset(params.offset)
        .orderBy(event.createdAt),
      db
        .select({ count: count() })
        .from(event)
        .where(eq(event.organizationId, params.organizationId)),
    ])

    const total = totalResult[0]?.count ?? 0

    return {
      events: events.map((e) => ({
        ...e,
        payload: JSON.parse(e.payload),
        status: "pending" as const,
      })),
      total,
    }
  },

  async getEvent(organizationId: string, eventId: string) {
    const result = await db
      .select()
      .from(event)
      .where(and(eq(event.id, eventId), eq(event.organizationId, organizationId)))
      .limit(1)

    if (!result[0]) return null

    return {
      ...result[0],
      payload: JSON.parse(result[0].payload),
      status: "pending" as const,
    }
  },

  async getDeliveries(eventId: string) {
    const deliveries = await db
      .select()
      .from(delivery)
      .where(eq(delivery.eventId, eventId))

    return deliveries
  },
}

export const webhooks = new Elysia({ prefix: "/webhooks" })
  .use(withApiKey)
  .post(
    "/",
    async ({ organizationId, body, set }) => {
      set.status = 201
      return WebhookService.createEvent({
        organizationId,
        eventType: body.eventType,
        payload: body.payload,
        idempotencyKey: body.idempotencyKey,
        endpointIds: body.endpointIds,
      })
    },
    {
      body: SendWebhookBody,
      response: { 201: WebhookEvent },
    }
  )
  .post(
    "/batch",
    async ({ organizationId, body, set }) => {
      set.status = 201
      return WebhookService.createBatch({
        organizationId,
        events: body.events,
      })
    },
    {
      body: SendWebhookBatchBody,
      response: { 201: WebhookBatchResult },
    }
  )
  .get(
    "/events",
    async ({ organizationId, query }) => {
      return WebhookService.getEvents({
        organizationId,
        limit: query.limit ?? 20,
        offset: query.offset ?? 0,
      })
    },
    {
      query: PaginationQuery,
      response: WebhookEventList,
    }
  )
  .get(
    "/events/:id",
    async ({ organizationId, params, status }) => {
      const event = await WebhookService.getEvent(organizationId, params.id)

      if (!event) {
        return status(404, { error: "Event not found" })
      }

      return event
    },
    {
      params: IdParam,
      response: {
        200: WebhookEvent,
        404: ErrorResponse,
      },
    }
  )

export { WebhookService }
