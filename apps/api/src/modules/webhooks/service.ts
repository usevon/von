import { eq, and, count } from "drizzle-orm"
import { db } from "@von/db"
import { event, delivery, endpoint } from "@von/db/schema"
import { getWebhookDeliveryQueue } from "@von/queue"
import type { WebhookEventType } from "@/modules/webhooks/model"

export type CreateEventParams = {
  organizationId: string
  eventType: string
  payload: unknown
  idempotencyKey?: string
  endpointIds?: string[]
}

export type GetEventsParams = {
  organizationId: string
  limit: number
  offset: number
}

const toEventResponse = (row: typeof event.$inferSelect): WebhookEventType => ({
  id: row.id,
  eventType: row.eventType,
  payload: JSON.parse(row.payload),
  idempotencyKey: row.idempotencyKey,
  status: "pending",
  createdAt: row.createdAt.toISOString(),
})

export const WebhookService = {
  async createEvent(params: CreateEventParams): Promise<WebhookEventType> {
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
        return toEventResponse(existing[0])
      }
    }

    const result = await db
      .insert(event)
      .values({
        id: crypto.randomUUID(),
        organizationId: params.organizationId,
        eventType: params.eventType,
        payload: JSON.stringify(params.payload),
        idempotencyKey: params.idempotencyKey ?? null,
        createdAt: now,
      })
      .returning()

    const newEvent = result[0]!

    let targetEndpoints: { id: string }[]

    if (params.endpointIds && params.endpointIds.length > 0) {
      targetEndpoints = await db
        .select({ id: endpoint.id })
        .from(endpoint)
        .where(
          and(
            eq(endpoint.organizationId, params.organizationId),
            eq(endpoint.enabled, true)
          )
        )
        .then((endpoints) =>
          endpoints.filter((e) => params.endpointIds!.includes(e.id))
        )
    } else {
      targetEndpoints = await db
        .select({ id: endpoint.id })
        .from(endpoint)
        .where(
          and(
            eq(endpoint.organizationId, params.organizationId),
            eq(endpoint.enabled, true)
          )
        )
    }

    if (targetEndpoints.length > 0) {
      const deliveryRecords = await db
        .insert(delivery)
        .values(
          targetEndpoints.map((ep) => ({
            id: crypto.randomUUID(),
            eventId: newEvent.id,
            endpointId: ep.id,
            status: "pending",
            attempts: 0,
            nextAttemptAt: now,
            createdAt: now,
            updatedAt: now,
          }))
        )
        .returning()

      const queue = getWebhookDeliveryQueue()
      await Promise.all(
        deliveryRecords.map((d) =>
          queue.add("webhook-delivery", {
            deliveryId: d.id,
            eventId: newEvent.id,
            endpointId: d.endpointId,
          })
        )
      )
    }

    return toEventResponse(newEvent)
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

    return {
      events: events.map(toEventResponse),
      total: totalResult[0]?.count ?? 0,
    }
  },

  async getEvent(
    organizationId: string,
    eventId: string
  ): Promise<WebhookEventType | null> {
    const result = await db
      .select()
      .from(event)
      .where(and(eq(event.id, eventId), eq(event.organizationId, organizationId)))
      .limit(1)

    if (!result[0]) return null
    return toEventResponse(result[0])
  },

  async getDeliveries(eventId: string) {
    const deliveries = await db
      .select()
      .from(delivery)
      .where(eq(delivery.eventId, eventId))

    return deliveries.map((d) => ({
      id: d.id,
      eventId: d.eventId,
      endpointId: d.endpointId,
      status: d.status,
      attempts: d.attempts,
      nextAttemptAt: d.nextAttemptAt?.toISOString() ?? null,
      lastAttemptAt: d.lastAttemptAt?.toISOString() ?? null,
      responseStatus: d.responseStatus,
      createdAt: d.createdAt.toISOString(),
    }))
  },
}
