import { eq, and, count, inArray } from "drizzle-orm"
import { db } from "@von/db"
import { event, delivery } from "@von/db/schema"
import { getWebhookDeliveryQueue, getRedisClient } from "@von/queue"
import { EndpointService } from "@/modules/endpoints/service"
import type { WebhookEventType } from "@/modules/webhooks/model"

const redis = getRedisClient()
const IDEMPOTENCY_TTL = 24 * 60 * 60

let endpointCache: {
  orgId: string
  endpoints: Array<{ id: string; url: string; secret: string; timeoutMs: number; retryCount: number }>
  expiry: number
} | null = null
const ENDPOINT_CACHE_TTL = 30000

export type CreateEventParams = {
  organizationId: string
  eventType: string
  payload: unknown
  idempotencyKey?: string
  endpointIds?: string[]
}

export type CreateBatchParams = {
  organizationId: string
  events: Array<{
    eventType: string
    payload: unknown
    idempotencyKey?: string
    endpointIds?: string[]
  }>
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
      const cacheKey = `idempotency:${params.organizationId}:${params.idempotencyKey}`
      const cached = await redis.get(cacheKey)

      if (cached) {
        return JSON.parse(cached) as WebhookEventType
      }

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
        const response = toEventResponse(existing[0])
        redis.setex(cacheKey, IDEMPOTENCY_TTL, JSON.stringify(response))
        return response
      }
    }

    const payloadStr = JSON.stringify(params.payload)
    const eventId = crypto.randomUUID()

    let targetEndpoints: Array<{ id: string; url: string; secret: string; timeoutMs: number; retryCount: number }>
    if (endpointCache && endpointCache.orgId === params.organizationId && endpointCache.expiry > Date.now()) {
      targetEndpoints = endpointCache.endpoints
      if (params.endpointIds && params.endpointIds.length > 0) {
        targetEndpoints = targetEndpoints.filter((ep) => params.endpointIds!.includes(ep.id))
      }
    } else {
      targetEndpoints = await EndpointService.getEnabledEndpointsForDelivery(
        params.organizationId,
        params.endpointIds
      )
      if (!params.endpointIds || params.endpointIds.length === 0) {
        endpointCache = { orgId: params.organizationId, endpoints: targetEndpoints, expiry: Date.now() + ENDPOINT_CACHE_TTL }
      }
    }

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

    const newEvent = result[0]!

    if (targetEndpoints.length > 0) {
      const queue = getWebhookDeliveryQueue()
      const jobs = deliveryData.map((d, i) => ({
        name: "webhook-delivery",
        data: {
          deliveryId: d.id,
          eventId,
          payload: payloadStr,
          eventType: params.eventType,
          endpoint: targetEndpoints[i]!,
        },
      }))

      await Promise.all([
        db.insert(delivery).values(deliveryData),
        queue.addBulk(jobs),
      ])
    }
    const response = toEventResponse(newEvent)

    if (params.idempotencyKey) {
      const cacheKey = `idempotency:${params.organizationId}:${params.idempotencyKey}`
      redis.setex(cacheKey, IDEMPOTENCY_TTL, JSON.stringify(response))
    }

    return response
  },

  async createBatch(params: CreateBatchParams): Promise<{ created: number; events: WebhookEventType[] }> {
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
      const pipeline = redis.pipeline()
      for (const key of idempotencyKeys) {
        pipeline.get(`idempotency:${params.organizationId}:${key}`)
      }
      const cachedResults = await pipeline.exec()

      const uncachedKeys: string[] = []
      if (cachedResults) {
        for (let i = 0; i < idempotencyKeys.length; i++) {
          const [err, cached] = cachedResults[i] as [Error | null, string | null]
          if (!err && cached) {
            const evt = JSON.parse(cached) as WebhookEventType
            existingByKey.set(idempotencyKeys[i]!, {
              id: evt.id,
              eventType: evt.eventType,
              payload: JSON.stringify(evt.payload),
              idempotencyKey: evt.idempotencyKey,
              organizationId: params.organizationId,
              createdAt: new Date(evt.createdAt),
            } as typeof event.$inferSelect)
          } else {
            uncachedKeys.push(idempotencyKeys[i]!)
          }
        }
      }

      if (uncachedKeys.length > 0) {
        const existing = await db
          .select()
          .from(event)
          .where(
            and(
              eq(event.organizationId, params.organizationId),
              inArray(event.idempotencyKey, uncachedKeys)
            )
          )
        for (const e of existing) {
          if (e.idempotencyKey) {
            existingByKey.set(e.idempotencyKey, e)
          }
        }
      }
    }

    for (const evt of params.events) {
      if (evt.idempotencyKey && existingByKey.has(evt.idempotencyKey)) {
        results.push(toEventResponse(existingByKey.get(evt.idempotencyKey)!))
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

    let allEndpoints: Array<{ id: string; url: string; secret: string; timeoutMs: number; retryCount: number }>
    if (endpointCache && endpointCache.orgId === params.organizationId && endpointCache.expiry > Date.now()) {
      allEndpoints = endpointCache.endpoints
    } else {
      allEndpoints = await EndpointService.getEnabledEndpointsForDelivery(params.organizationId)
      endpointCache = { orgId: params.organizationId, endpoints: allEndpoints, expiry: Date.now() + ENDPOINT_CACHE_TTL }
    }

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
      const inserted = insertedEvents[i]!
      const original = newEvents[i]!

      let targetEndpoints = allEndpoints
      if (original.endpointIds && original.endpointIds.length > 0) {
        targetEndpoints = allEndpoints.filter((ep) => original.endpointIds!.includes(ep.id))
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

      results.push(toEventResponse(inserted))
    }

    if (allDeliveries.length > 0) {
      const queue = getWebhookDeliveryQueue()
      await Promise.all([
        db.insert(delivery).values(allDeliveries),
        queue.addBulk(allJobs),
      ])
    }

    const idempotentEvents = insertedEvents.filter((e) => e.idempotencyKey)
    if (idempotentEvents.length > 0) {
      const pipeline = redis.pipeline()
      for (const e of idempotentEvents) {
        const cacheKey = `idempotency:${params.organizationId}:${e.idempotencyKey}`
        pipeline.setex(cacheKey, IDEMPOTENCY_TTL, JSON.stringify(toEventResponse(e)))
      }
      pipeline.exec()
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
