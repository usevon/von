import { eq, and } from "drizzle-orm"
import { db } from "@von/db"
import { endpoint } from "@von/db/schema"
import { generateId } from "@von/auth"
import { InternalServerError, NotFoundError } from "@/lib/errors"
import type { EndpointModel } from "./model"

type CreateEndpointParams = {
  organizationId: string
  url: string
  description?: string
  enabled?: boolean
  retryCount?: number
  timeoutMs?: number
}

type UpdateEndpointParams = {
  organizationId: string
  endpointId: string
  url?: string
  description?: string
  enabled?: boolean
  retryCount?: number
  timeoutMs?: number
}

const generateSecret = () => `whsec_${generateId()}`

export abstract class EndpointService {
  static async create(params: CreateEndpointParams): Promise<EndpointModel.endpoint> {
    try {
      const now = new Date()

      const result = await db
        .insert(endpoint)
        .values({
          id: crypto.randomUUID(),
          organizationId: params.organizationId,
          url: params.url,
          description: params.description ?? null,
          secret: generateSecret(),
          enabled: params.enabled ?? true,
          retryCount: params.retryCount ?? 3,
          timeoutMs: params.timeoutMs ?? 30000,
          createdAt: now,
          updatedAt: now,
        })
        .returning()

      if (!result[0]) throw new Error("Failed to create endpoint")

      return {
        ...result[0],
        createdAt: result[0].createdAt.toISOString(),
        updatedAt: result[0].updatedAt.toISOString(),
      }
    } catch (error) {
      console.error("Error creating endpoint:", error)
      throw new InternalServerError("Failed to create endpoint")
    }
  }

  static async getAll(
    organizationId: string,
    limit: number,
    offset: number
  ): Promise<EndpointModel.endpointList> {
    try {
      const endpoints = await db
        .select()
        .from(endpoint)
        .where(eq(endpoint.organizationId, organizationId))

      return {
        endpoints: endpoints.slice(offset, offset + limit).map((e) => ({
          ...e,
          createdAt: e.createdAt.toISOString(),
          updatedAt: e.updatedAt.toISOString(),
        })),
        total: endpoints.length,
      }
    } catch (error) {
      console.error("Error fetching endpoints:", error)
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
      return {
        ...result[0],
        createdAt: result[0].createdAt.toISOString(),
        updatedAt: result[0].updatedAt.toISOString(),
      }
    } catch (error) {
      console.error("Error fetching endpoint:", error)
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
          retryCount: params.retryCount ?? existing[0].retryCount,
          timeoutMs: params.timeoutMs ?? existing[0].timeoutMs,
          updatedAt: new Date(),
        })
        .where(eq(endpoint.id, params.endpointId))
        .returning()

      if (!result[0]) throw new Error("Failed to update endpoint")

      return {
        ...result[0],
        createdAt: result[0].createdAt.toISOString(),
        updatedAt: result[0].updatedAt.toISOString(),
      }
    } catch (error) {
      console.error("Error updating endpoint:", error)
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
      console.error("Error deleting endpoint:", error)
      throw new InternalServerError("Failed to delete endpoint")
    }
  }

  static async getEnabledEndpointsForDelivery(
    organizationId: string,
    filterIds?: string[]
  ): Promise<
    Array<{
      id: string
      url: string
      secret: string
      timeoutMs: number
      retryCount: number
    }>
  > {
    try {
      const endpoints = await db
        .select()
        .from(endpoint)
        .where(eq(endpoint.organizationId, organizationId))

      let enabled = endpoints.filter((e) => e.enabled)
      if (filterIds && filterIds.length > 0) {
        enabled = enabled.filter((e) => filterIds.includes(e.id))
      }

      return enabled.map((e) => ({
        id: e.id,
        url: e.url,
        secret: e.secret,
        timeoutMs: e.timeoutMs,
        retryCount: e.retryCount,
      }))
    } catch (error) {
      console.error("Error fetching enabled endpoints:", error)
      throw new InternalServerError("Failed to fetch enabled endpoints")
    }
  }
}
