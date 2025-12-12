import { eq, and, inArray, sql } from "drizzle-orm"
import { db } from "@usevon/db"
import { event, delivery } from "@usevon/db/schema"
import { getWebhookDeliveryQueue } from "@usevon/queue"
import type { WebhookDeliveryJob } from "@usevon/queue"
import { InternalServerError, generateId } from "@usevon/utils"
import { EndpointService } from "@/modules/endpoints"
import type { WebhookModel } from "./model"

type EventRow = typeof event.$inferSelect
type DeliveryRow = typeof delivery.$inferSelect

const toEvent = (e: EventRow): WebhookModel.event => ({
  id: e.id,
  eventType: e.eventType,
  payload: JSON.parse(e.payload),
  idempotencyKey: e.idempotencyKey,
  status: "pending",
  createdAt: e.createdAt.toISOString(),
})

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
})

type CreateEventParams = {
  organizationId: string
  eventType: string
  payload: unknown
  idempotencyKey?: string
  endpointIds?: string[]
  requestId?: string
}

type CreateBatchParams = {
  organizationId: string
  events: Array<{
    eventType: string
    payload: unknown
    idempotencyKey?: string
    endpointIds?: string[]
  }>
  requestId?: string
}

export abstract class WebhookService {
  private static getEventStmt = db
    .select()
    .from(event)
    .where(
      and(eq(event.id, sql.placeholder("eventId")), eq(event.organizationId, sql.placeholder("orgId")))
    )
    .limit(1)
    .prepare("get_event")

  private static getDeliveriesStmt = db
    .select()
    .from(delivery)
    .where(eq(delivery.eventId, sql.placeholder("eventId")))
    .prepare("get_deliveries")

  static async createEvent(params: CreateEventParams): Promise<WebhookModel.event> {
    const result = await this.createBatch({
      organizationId: params.organizationId,
      events: [
        {
          eventType: params.eventType,
          payload: params.payload,
          idempotencyKey: params.idempotencyKey,
          endpointIds: params.endpointIds,
        },
      ],
      requestId: params.requestId,
    })
    const created = result.events[0]
    if (!created) throw new InternalServerError("Failed to create webhook event")
    return created
  }

  static async createBatch(params: CreateBatchParams): Promise<WebhookModel.batchResult> {
    const now = new Date()
    const nowIso = now.toISOString()
    const idempotencyKeys = params.events.map((e) => e.idempotencyKey).filter((k): k is string => !!k)

    const [existingEvents, allEndpoints] = await Promise.all([
      idempotencyKeys.length > 0
        ? db
            .select()
            .from(event)
            .where(
              and(eq(event.organizationId, params.organizationId), inArray(event.idempotencyKey, idempotencyKeys))
            )
        : [],
      EndpointService.getEnabledEndpointsForDelivery(params.organizationId),
    ])

    const existingByKey = new Map(
      existingEvents.filter((e) => e.idempotencyKey).map((e) => [e.idempotencyKey!, e])
    )
    const endpointsById = new Map(allEndpoints.map((ep) => [ep.id, ep]))

    const results: WebhookModel.event[] = []
    type NewEvent = { id: string; eventType: string; payload: unknown; idempotencyKey: string | null; endpointIds?: string[] }
    const newEvents: NewEvent[] = []

    for (const evt of params.events) {
      if (evt.idempotencyKey && existingByKey.has(evt.idempotencyKey)) {
        results.push(toEvent(existingByKey.get(evt.idempotencyKey)!))
        continue
      }
      newEvents.push({
        id: generateId(),
        eventType: evt.eventType,
        payload: evt.payload,
        idempotencyKey: evt.idempotencyKey ?? null,
        endpointIds: evt.endpointIds,
      })
    }

    if (newEvents.length === 0) return { created: 0, events: results }

    const allDeliveries: Array<typeof delivery.$inferInsert> = []
    const allJobs: Array<{ name: string; data: WebhookDeliveryJob }> = []

    for (const evt of newEvents) {
      const targets = evt.endpointIds?.length
        ? evt.endpointIds.flatMap((id) => endpointsById.get(id) ?? [])
        : allEndpoints

      const payloadStr = JSON.stringify(evt.payload)
      for (const ep of targets) {
        const deliveryId = generateId()
        allDeliveries.push({
          id: deliveryId,
          eventId: evt.id,
          endpointId: ep.id,
          status: "pending",
          attempts: 0,
          nextAttemptAt: now,
          createdAt: now,
          updatedAt: now,
        })
        allJobs.push({
          name: "webhook-delivery",
          data: { deliveryId, eventId: evt.id, payload: payloadStr, eventType: evt.eventType, endpoint: ep, organizationId: params.organizationId, requestId: params.requestId },
        })
      }
    }

    await db.transaction(async (tx) => {
      await tx.insert(event).values(
        newEvents.map((e) => ({
          id: e.id,
          organizationId: params.organizationId,
          eventType: e.eventType,
          payload: JSON.stringify(e.payload),
          idempotencyKey: e.idempotencyKey,
          createdAt: now,
        }))
      )
      if (allDeliveries.length > 0) await tx.insert(delivery).values(allDeliveries)
    })

    if (allJobs.length > 0) await getWebhookDeliveryQueue().addBulk(allJobs)

    for (const e of newEvents) {
      results.push({ id: e.id, eventType: e.eventType, payload: e.payload, idempotencyKey: e.idempotencyKey, status: "pending", createdAt: nowIso })
    }

    return { created: newEvents.length, events: results }
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
    ])
    return { events: events.map(toEvent), total }
  }

  static async getEvent(organizationId: string, eventId: string): Promise<WebhookModel.event | null> {
    const [result] = await this.getEventStmt.execute({ eventId, orgId: organizationId })
    return result ? toEvent(result) : null
  }

  static async getDeliveries(eventId: string): Promise<WebhookModel.delivery[]> {
    const rows = await this.getDeliveriesStmt.execute({ eventId })
    return rows.map(toDelivery)
  }
}