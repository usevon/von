import { Elysia, t, type Static } from "elysia"
import { eq, and } from "drizzle-orm"
import { db } from "@von/db"
import { endpoint } from "@von/db/schema"
import { generateId } from "@von/auth"
import { IdParam, PaginationQuery, ErrorResponse, SuccessResponse } from "@/lib/models"
import { withApiKey } from "@/modules/auth"

export const CreateEndpointBody = t.Object({
  url: t.String({ format: "uri" }),
  description: t.Optional(t.String()),
  enabled: t.Optional(t.Boolean({ default: true })),
  retryCount: t.Optional(t.Number({ default: 3, minimum: 0, maximum: 10 })),
  timeoutMs: t.Optional(t.Number({ default: 30000, minimum: 1000, maximum: 60000 })),
})

export const UpdateEndpointBody = t.Object({
  url: t.Optional(t.String({ format: "uri" })),
  description: t.Optional(t.String()),
  enabled: t.Optional(t.Boolean()),
  retryCount: t.Optional(t.Number({ minimum: 0, maximum: 10 })),
  timeoutMs: t.Optional(t.Number({ minimum: 1000, maximum: 60000 })),
})

export const Endpoint = t.Object({
  id: t.String({ format: "uuid" }),
  url: t.String(),
  description: t.Union([t.String(), t.Null()]),
  secret: t.String(),
  enabled: t.Boolean(),
  retryCount: t.Number(),
  timeoutMs: t.Number(),
  createdAt: t.String(),
  updatedAt: t.String(),
})

export const EndpointList = t.Object({
  endpoints: t.Array(Endpoint),
  total: t.Number(),
})

export type CreateEndpointBodyType = Static<typeof CreateEndpointBody>
export type UpdateEndpointBodyType = Static<typeof UpdateEndpointBody>
export type EndpointType = Static<typeof Endpoint>

type CreateEndpointParams = CreateEndpointBodyType & {
  organizationId: string
}

type UpdateEndpointParams = Partial<UpdateEndpointBodyType> & {
  organizationId: string
  endpointId: string
}

type GetEndpointsParams = {
  organizationId: string
  limit: number
  offset: number
}

const generateSecret = () => `whsec_${generateId()}`

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

const EndpointService = {
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

    return toEndpointResponse(result[0]!)
  },

  async getAll(params: GetEndpointsParams) {
    const endpoints = await db
      .select()
      .from(endpoint)
      .where(eq(endpoint.organizationId, params.organizationId))

    const allEndpoints = endpoints.map(toEndpointResponse)

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

    return toEndpointResponse(result[0]!)
  },

  async delete(organizationId: string, endpointId: string): Promise<boolean> {
    const result = await db
      .delete(endpoint)
      .where(and(eq(endpoint.id, endpointId), eq(endpoint.organizationId, organizationId)))
      .returning({ id: endpoint.id })

    return result.length > 0
  },

  async getEnabledEndpointsForDelivery(
    organizationId: string,
    filterIds?: string[]
  ): Promise<Array<{ id: string; url: string; secret: string; timeoutMs: number; retryCount: number }>> {
    const endpoints = await db
      .select()
      .from(endpoint)
      .where(eq(endpoint.organizationId, organizationId))

    const allEndpoints = endpoints.map(toEndpointResponse)

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

export const endpoints = new Elysia({ prefix: "/endpoints" })
  .use(withApiKey)
  .post(
    "/",
    async ({ organizationId, body, set }) => {
      set.status = 201
      return EndpointService.create({
        organizationId,
        ...body,
      })
    },
    {
      body: CreateEndpointBody,
      response: { 201: Endpoint },
    }
  )
  .get(
    "/",
    async ({ organizationId, query }) => {
      return EndpointService.getAll({
        organizationId,
        limit: query.limit ?? 20,
        offset: query.offset ?? 0,
      })
    },
    {
      query: PaginationQuery,
      response: EndpointList,
    }
  )
  .get(
    "/:id",
    async ({ organizationId, params, status }) => {
      const endpoint = await EndpointService.getById(organizationId, params.id)

      if (!endpoint) {
        return status(404, { error: "Endpoint not found" })
      }

      return endpoint
    },
    {
      params: IdParam,
      response: {
        200: Endpoint,
        404: ErrorResponse,
      },
    }
  )
  .patch(
    "/:id",
    async ({ organizationId, params, body, status }) => {
      const endpoint = await EndpointService.update({
        organizationId,
        endpointId: params.id,
        ...body,
      })

      if (!endpoint) {
        return status(404, { error: "Endpoint not found" })
      }

      return endpoint
    },
    {
      params: IdParam,
      body: UpdateEndpointBody,
      response: {
        200: Endpoint,
        404: ErrorResponse,
      },
    }
  )
  .delete(
    "/:id",
    async ({ organizationId, params }) => {
      await EndpointService.delete(organizationId, params.id)

      return { success: true }
    },
    {
      params: IdParam,
      response: SuccessResponse,
    }
  )

export { EndpointService }
