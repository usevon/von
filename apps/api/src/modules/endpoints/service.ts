import { eq, and } from "drizzle-orm"
import { nanoid } from "nanoid"
import { db } from "@von/db"
import { endpoint } from "@von/db/schema"
import { getRedisClient } from "@von/queue"
import type { CreateEndpointBodyType, UpdateEndpointBodyType, EndpointType } from "@/modules/endpoints/model"

export type CreateEndpointParams = CreateEndpointBodyType & {
  organizationId: string
}

export type UpdateEndpointParams = Partial<UpdateEndpointBodyType> & {
  organizationId: string
  endpointId: string
}

export type GetEndpointsParams = {
  organizationId: string
  limit: number
  offset: number
}

const CACHE_TTL = 60
const redis = getRedisClient()

const getCacheKey = (orgId: string) => `endpoints:${orgId}`

const generateSecret = () => `whsec_${nanoid(32)}`

const toEndpointResponse = (row: typeof endpoint.$inferSelect): EndpointType => ({
  id: row.id,
  url: row.url,
  description: row.description,
  secret: row.secret,
  enabled: row.enabled,
  retryCount: row.retryCount,
  timeoutMs: row.timeoutMs,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
})

export const EndpointService = {
  async create(params: CreateEndpointParams): Promise<EndpointType> {
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

    await redis.del(getCacheKey(params.organizationId))
    return toEndpointResponse(result[0])
  },

  async getAll(params: GetEndpointsParams) {
    const cacheKey = getCacheKey(params.organizationId)
    const cached = await redis.get(cacheKey)

    if (cached) {
      const allEndpoints = JSON.parse(cached) as EndpointType[]
      const offset = params.offset
      const limit = params.limit
      return {
        endpoints: allEndpoints.slice(offset, offset + limit),
        total: allEndpoints.length,
      }
    }

    const endpoints = await db
      .select()
      .from(endpoint)
      .where(eq(endpoint.organizationId, params.organizationId))

    const allEndpoints = endpoints.map(toEndpointResponse)
    await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(allEndpoints))

    return {
      endpoints: allEndpoints.slice(params.offset, params.offset + params.limit),
      total: allEndpoints.length,
    }
  },

  async getById(organizationId: string, endpointId: string): Promise<EndpointType | null> {
    const result = await db
      .select()
      .from(endpoint)
      .where(and(eq(endpoint.id, endpointId), eq(endpoint.organizationId, organizationId)))
      .limit(1)

    if (!result[0]) return null
    return toEndpointResponse(result[0])
  },

  async update(params: UpdateEndpointParams): Promise<EndpointType | null> {
    const existing = await db
      .select()
      .from(endpoint)
      .where(and(eq(endpoint.id, params.endpointId), eq(endpoint.organizationId, params.organizationId)))
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

    await redis.del(getCacheKey(params.organizationId))
    return toEndpointResponse(result[0])
  },

  async delete(organizationId: string, endpointId: string): Promise<boolean> {
    const result = await db
      .delete(endpoint)
      .where(and(eq(endpoint.id, endpointId), eq(endpoint.organizationId, organizationId)))
      .returning({ id: endpoint.id })

    await redis.del(getCacheKey(organizationId))
    return result.length > 0
  },

  async getEnabledEndpointsForDelivery(
    organizationId: string,
    filterIds?: string[]
  ): Promise<Array<{ id: string; url: string; secret: string; timeoutMs: number; retryCount: number }>> {
    const cacheKey = getCacheKey(organizationId)
    const cached = await redis.get(cacheKey)

    let allEndpoints: EndpointType[]

    if (cached) {
      allEndpoints = JSON.parse(cached) as EndpointType[]
    } else {
      const endpoints = await db
        .select()
        .from(endpoint)
        .where(eq(endpoint.organizationId, organizationId))

      allEndpoints = endpoints.map(toEndpointResponse)
      await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(allEndpoints))
    }

    let enabled = allEndpoints.filter((e) => e.enabled)
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
  },
}
