import { eq, and, count, inArray } from "drizzle-orm"
import { db } from "@von/db"
import { event, delivery } from "@von/db/schema"
import { getWebhookDeliveryQueue } from "@von/queue"
import { InternalServerError } from "@/lib/errors"
import { EndpointService } from "@/modules/endpoints"
import { publish } from "@/websocket/server"
import type { WebhookModel } from "./model"

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

export abstract class WebhookService {
  static async createEvent(params: CreateEventParams): Promise<WebhookModel.event> {
    try {
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
            status: "pending",
            createdAt: existing[0].createdAt.toISOString(),
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

      const newEvent = await db.transaction(async (tx) => {
        const result = await tx
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

        if (targetEndpoints.length > 0) {
          await tx.insert(delivery).values(deliveryData)
        }

        return result[0]
      })

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

        await queue.addBulk(jobs)
      }

      const result = {
        id: newEvent.id,
        eventType: newEvent.eventType,
        payload: JSON.parse(newEvent.payload),
        idempotencyKey: newEvent.idempotencyKey,
        status: "pending",
        createdAt: newEvent.createdAt.toISOString(),
      }

      publish(`webhook_events:${params.organizationId}`, result)

      return result
    } catch (error) {
      console.error("Error creating webhook event:", error)
      throw new InternalServerError("Failed to create webhook event")
    }
  }

  static async createBatch(params: CreateBatchParams): Promise<WebhookModel.batchResult> {
    try {
      const now = new Date()
      const results: WebhookModel.event[] = []
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
            status: "pending",
            createdAt: existing.createdAt.toISOString(),
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

      const allEndpoints = await EndpointService.getEnabledEndpointsForDelivery(
        params.organizationId
      )

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
          endpoint: {
            id: string
            url: string
            secret: string
            timeoutMs: number
            retryCount: number
          }
        }
      }> = []

      const insertedEvents = await db.transaction(async (tx) => {
        const inserted = await tx
          .insert(event)
          .values(
            newEvents.map((e) => ({
              id: e.id,
              organizationId: e.organizationId,
              eventType: e.eventType,
              payload: e.payload,
              idempotencyKey: e.idempotencyKey,
              createdAt: e.createdAt,
            }))
          )
          .returning()

        for (let i = 0; i < inserted.length; i++) {
          const insertedEvent = inserted[i]
          const original = newEvents[i]
          if (!insertedEvent || !original) continue

          let targetEndpoints = allEndpoints
          if (original.endpointIds && original.endpointIds.length > 0) {
            targetEndpoints = allEndpoints.filter(
              (ep) => original.endpointIds && original.endpointIds.includes(ep.id)
            )
          }

          for (const ep of targetEndpoints) {
            const deliveryId = crypto.randomUUID()
            allDeliveries.push({
              id: deliveryId,
              eventId: insertedEvent.id,
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
                eventId: insertedEvent.id,
                payload: original.payload,
                eventType: insertedEvent.eventType,
                endpoint: ep,
              },
            })
          }
        }

        if (allDeliveries.length > 0) {
          await tx.insert(delivery).values(allDeliveries)
        }

        return inserted
      })

      if (allJobs.length > 0) {
        const queue = getWebhookDeliveryQueue()
        await queue.addBulk(allJobs)
      }

      for (let i = 0; i < insertedEvents.length; i++) {
        const inserted = insertedEvents[i]
        const original = newEvents[i]
        if (!inserted || !original) continue

        results.push({
          id: inserted.id,
          eventType: inserted.eventType,
          payload: JSON.parse(original.payload),
          idempotencyKey: inserted.idempotencyKey,
          status: "pending",
          createdAt: inserted.createdAt.toISOString(),
        })
      }

      return { created: newEvents.length, events: results }
    } catch (error) {
      console.error("Error creating webhook batch:", error)
      throw new InternalServerError("Failed to create webhook batch")
    }
  }

  static async getEvents(
    organizationId: string,
    limit: number,
    offset: number
  ): Promise<WebhookModel.eventList> {
    try {
      const [events, totalResult] = await Promise.all([
        db
          .select()
          .from(event)
          .where(eq(event.organizationId, organizationId))
          .limit(limit)
          .offset(offset)
          .orderBy(event.createdAt),
        db
          .select({ count: count() })
          .from(event)
          .where(eq(event.organizationId, organizationId)),
      ])

      const total = totalResult[0]?.count ?? 0

      return {
        events: events.map((e) => ({
          id: e.id,
          eventType: e.eventType,
          payload: JSON.parse(e.payload),
          idempotencyKey: e.idempotencyKey,
          status: "pending",
          createdAt: e.createdAt.toISOString(),
        })),
        total,
      }
    } catch (error) {
      console.error("Error fetching webhook events:", error)
      throw new InternalServerError("Failed to fetch webhook events")
    }
  }

  static async getEvent(
    organizationId: string,
    eventId: string
  ): Promise<WebhookModel.event | null> {
    try {
      const result = await db
        .select()
        .from(event)
        .where(and(eq(event.id, eventId), eq(event.organizationId, organizationId)))
        .limit(1)

      if (!result[0]) return null

      return {
        id: result[0].id,
        eventType: result[0].eventType,
        payload: JSON.parse(result[0].payload),
        idempotencyKey: result[0].idempotencyKey,
        status: "pending",
        createdAt: result[0].createdAt.toISOString(),
      }
    } catch (error) {
      console.error("Error fetching webhook event:", error)
      throw new InternalServerError("Failed to fetch webhook event")
    }
  }

  static async getDeliveries(eventId: string): Promise<WebhookModel.delivery[]> {
    try {
      const deliveries = await db.select().from(delivery).where(eq(delivery.eventId, eventId))

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
    } catch (error) {
      console.error("Error fetching deliveries:", error)
      throw new InternalServerError("Failed to fetch deliveries")
    }
  }
}
