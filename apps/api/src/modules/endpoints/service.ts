import { eq, and, inArray } from "drizzle-orm"
import { db } from "@usevon/db"
import { endpoint } from "@usevon/db/schema"
import type { DeliveryEndpoint } from "@usevon/queue"
import { InternalServerError, generateSecret, generateId, toISODates } from "@usevon/utils"
import { log } from "@/lib/logger"
import type { EndpointModel } from "@/modules/endpoints/model"

type EndpointFields = {
  url: string
  description?: string
  enabled?: boolean
  version?: string | null
  retryCount?: number
  timeoutMs?: number
}

type CreateEndpointParams = EndpointFields & { organizationId: string }
type UpdateEndpointParams = Partial<EndpointFields> & { organizationId: string; endpointId: string }

const toEndpoint = (e: typeof endpoint.$inferSelect): EndpointModel.endpoint =>
  toISODates(e) as EndpointModel.endpoint

export abstract class EndpointService {
  static async create(params: CreateEndpointParams): Promise<EndpointModel.endpoint> {
    try {
      const now = new Date()

      const result = await db
        .insert(endpoint)
        .values({
          id: generateId(),
          organizationId: params.organizationId,
          url: params.url,
          description: params.description ?? null,
          secret: generateSecret(),
          enabled: params.enabled ?? true,
          version: params.version ?? null,
          retryCount: params.retryCount ?? 3,
          timeoutMs: params.timeoutMs ?? 30000,
          createdAt: now,
          updatedAt: now,
        })
        .returning()

      if (!result[0]) throw new Error("Failed to create endpoint")
      return toEndpoint(result[0])
    } catch (error) {
      log.error({ error }, "Error creating endpoint")
      throw new InternalServerError("Failed to create endpoint")
    }
  }

  static async getAll(
    organizationId: string,
    limit: number,
    offset: number
  ): Promise<EndpointModel.endpointList> {
    try {
      const [endpoints, total] = await Promise.all([
        db
          .select()
          .from(endpoint)
          .where(eq(endpoint.organizationId, organizationId))
          .limit(limit)
          .offset(offset),
        db.$count(endpoint, eq(endpoint.organizationId, organizationId)),
      ])
      return { endpoints: endpoints.map(toEndpoint), total }
    } catch (error) {
      log.error({ error }, "Error fetching endpoints")
      throw new InternalServerError("Failed to fetch endpoints")
    }
  }

  static async getById(
    organizationId: string,
    endpointId: string
  ): Promise<EndpointModel.endpoint | null> {
    try {
      const result = await db
        .select()
        .from(endpoint)
        .where(and(eq(endpoint.id, endpointId), eq(endpoint.organizationId, organizationId)))
        .limit(1)

      if (!result[0]) return null
      return toEndpoint(result[0])
    } catch (error) {
      log.error({ error }, "Error fetching endpoint")
      throw new InternalServerError("Failed to fetch endpoint")
    }
  }

  static async update(params: UpdateEndpointParams): Promise<EndpointModel.endpoint | null> {
    try {
      const existing = await db
        .select()
        .from(endpoint)
        .where(
          and(
            eq(endpoint.id, params.endpointId),
            eq(endpoint.organizationId, params.organizationId)
          )
        )
        .limit(1)

      if (!existing[0]) return null

      const result = await db
        .update(endpoint)
        .set({
          url: params.url ?? existing[0].url,
          description: params.description ?? existing[0].description,
          enabled: params.enabled ?? existing[0].enabled,
          version: params.version !== undefined ? params.version : existing[0].version,
          retryCount: params.retryCount ?? existing[0].retryCount,
          timeoutMs: params.timeoutMs ?? existing[0].timeoutMs,
          updatedAt: new Date(),
        })
        .where(eq(endpoint.id, params.endpointId))
        .returning()

      if (!result[0]) throw new Error("Failed to update endpoint")
      return toEndpoint(result[0])
    } catch (error) {
      log.error({ error }, "Error updating endpoint")
      throw new InternalServerError("Failed to update endpoint")
    }
  }

  static async delete(organizationId: string, endpointId: string): Promise<boolean> {
    try {
      const result = await db
        .delete(endpoint)
        .where(and(eq(endpoint.id, endpointId), eq(endpoint.organizationId, organizationId)))
        .returning({ id: endpoint.id })

      return result.length > 0
    } catch (error) {
      log.error({ error }, "Error deleting endpoint")
      throw new InternalServerError("Failed to delete endpoint")
    }
  }

  static async getEnabledEndpointsForDelivery(
    organizationId: string,
    filterIds?: string[]
  ): Promise<DeliveryEndpoint[]> {
    try {
      const conditions = [eq(endpoint.organizationId, organizationId), eq(endpoint.enabled, true)]
      if (filterIds?.length) conditions.push(inArray(endpoint.id, filterIds))

      return db
        .select({
          id: endpoint.id,
          url: endpoint.url,
          secret: endpoint.secret,
          timeoutMs: endpoint.timeoutMs,
          retryCount: endpoint.retryCount,
          version: endpoint.version,
        })
        .from(endpoint)
        .where(and(...conditions))
    } catch (error) {
      log.error({ error }, "Error fetching enabled endpoints")
      throw new InternalServerError("Failed to fetch enabled endpoints")
    }
  }
}
