import { eq, and, count } from "drizzle-orm"
import { nanoid } from "nanoid"
import { db } from "@/lib/db"
import { endpoint } from "@von/db/schema"
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

    return toEndpointResponse(result[0])
  },

  async getAll(params: GetEndpointsParams) {
    const [endpoints, totalResult] = await Promise.all([
      db
        .select()
        .from(endpoint)
        .where(eq(endpoint.organizationId, params.organizationId))
        .limit(params.limit)
        .offset(params.offset),
      db
        .select({ count: count() })
        .from(endpoint)
        .where(eq(endpoint.organizationId, params.organizationId)),
    ])

    return {
      endpoints: endpoints.map(toEndpointResponse),
      total: totalResult[0].count,
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

    return toEndpointResponse(result[0])
  },

  async delete(organizationId: string, endpointId: string): Promise<boolean> {
    const result = await db
      .delete(endpoint)
      .where(and(eq(endpoint.id, endpointId), eq(endpoint.organizationId, organizationId)))
      .returning({ id: endpoint.id })

    return result.length > 0
  },
}
