import { Elysia, t, type Static } from "elysia"
import { eq, and } from "drizzle-orm"
import { db } from "@von/db"
import { inboundEndpoint, inboundDelivery } from "@von/db/schema"
import { getInboundForwardingQueue } from "@von/queue"
import { generateId } from "@von/auth"
import { IdParam, PaginationQuery, ErrorResponse, SuccessResponse } from "@/lib/models"
import { withApiKey } from "@/modules/auth"

export const CreateInboundEndpointBody = t.Object({
  name: t.Optional(t.String()),
  provider: t.Optional(t.String()),
  forwardUrl: t.String({ format: "uri" }),
  enabled: t.Optional(t.Boolean({ default: true })),
})

export const UpdateInboundEndpointBody = t.Object({
  name: t.Optional(t.String()),
  provider: t.Optional(t.String()),
  forwardUrl: t.Optional(t.String({ format: "uri" })),
  enabled: t.Optional(t.Boolean()),
})

export const InboundEndpoint = t.Object({
  id: t.String({ format: "uuid" }),
  name: t.Union([t.String(), t.Null()]),
  provider: t.Union([t.String(), t.Null()]),
  secret: t.String(),
  forwardUrl: t.String(),
  enabled: t.Boolean(),
  createdAt: t.String(),
  updatedAt: t.String(),
})

export const InboundEndpointList = t.Object({
  endpoints: t.Array(InboundEndpoint),
  total: t.Number(),
})

export const InboundDelivery = t.Object({
  id: t.String({ format: "uuid" }),
  payload: t.Unknown(),
  headers: t.Union([t.Record(t.String(), t.String()), t.Null()]),
  status: t.String(),
  forwardedAt: t.Union([t.String(), t.Null()]),
  responseStatus: t.Union([t.Number(), t.Null()]),
  createdAt: t.String(),
})

export type CreateInboundEndpointBodyType = Static<typeof CreateInboundEndpointBody>
export type UpdateInboundEndpointBodyType = Static<typeof UpdateInboundEndpointBody>
export type InboundEndpointType = Static<typeof InboundEndpoint>
export type InboundDeliveryType = Static<typeof InboundDelivery>

type CreateInboundEndpointParams = CreateInboundEndpointBodyType & {
  organizationId: string
}

type UpdateInboundEndpointParams = Partial<UpdateInboundEndpointBodyType> & {
  organizationId: string
  endpointId: string
}

type GetInboundEndpointsParams = {
  organizationId: string
  limit: number
  offset: number
}

type ReceiveWebhookParams = {
  endpointId: string
  endpoint: {
    id: string
    forwardUrl: string
    secret: string
    timeoutMs: number
    retryCount: number
  }
  payload: unknown
  headers: Record<string, string>
}

const generateSecret = () => `whsec_${generateId()}`

const InboundService = {
  async create(params: CreateInboundEndpointParams) {
    const now = new Date()

    const result = await db
      .insert(inboundEndpoint)
      .values({
        id: crypto.randomUUID(),
        organizationId: params.organizationId,
        name: params.name ?? null,
        provider: params.provider ?? null,
        secret: generateSecret(),
        forwardUrl: params.forwardUrl,
        enabled: params.enabled ?? true,
        createdAt: now,
        updatedAt: now,
      })
      .returning()

    if (!result[0]) throw new Error("Failed to create inbound endpoint")
    return result[0]
  },

  async getAll(params: GetInboundEndpointsParams) {
    const endpoints = await db
      .select()
      .from(inboundEndpoint)
      .where(eq(inboundEndpoint.organizationId, params.organizationId))

    return {
      endpoints: endpoints.slice(params.offset, params.offset + params.limit),
      total: endpoints.length,
    }
  },

  async getById(organizationId: string, endpointId: string) {
    const result = await db
      .select()
      .from(inboundEndpoint)
      .where(
        and(
          eq(inboundEndpoint.id, endpointId),
          eq(inboundEndpoint.organizationId, organizationId)
        )
      )
      .limit(1)

    return result[0] ?? null
  },

  async getByPublicId(endpointId: string) {
    const result = await db
      .select()
      .from(inboundEndpoint)
      .where(eq(inboundEndpoint.id, endpointId))
      .limit(1)

    if (!result[0]) return null
    return result[0]
  },

  async update(params: UpdateInboundEndpointParams) {
    const existing = await db
      .select()
      .from(inboundEndpoint)
      .where(
        and(
          eq(inboundEndpoint.id, params.endpointId),
          eq(inboundEndpoint.organizationId, params.organizationId)
        )
      )
      .limit(1)

    if (!existing[0]) return null

    const result = await db
      .update(inboundEndpoint)
      .set({
        name: params.name ?? existing[0].name,
        provider: params.provider ?? existing[0].provider,
        forwardUrl: params.forwardUrl ?? existing[0].forwardUrl,
        enabled: params.enabled ?? existing[0].enabled,
        updatedAt: new Date(),
      })
      .where(eq(inboundEndpoint.id, params.endpointId))
      .returning()

    if (!result[0]) throw new Error("Failed to update inbound endpoint")
    return result[0]
  },

  async delete(organizationId: string, endpointId: string) {
    const result = await db
      .delete(inboundEndpoint)
      .where(
        and(
          eq(inboundEndpoint.id, endpointId),
          eq(inboundEndpoint.organizationId, organizationId)
        )
      )
      .returning({ id: inboundEndpoint.id })

    return result.length > 0
  },

  async receive(params: ReceiveWebhookParams) {
    const now = new Date()
    const deliveryId = crypto.randomUUID()
    const payloadStr = JSON.stringify(params.payload)
    const headersStr = JSON.stringify(params.headers)

    const queue = getInboundForwardingQueue()

    const [result] = await Promise.all([
      db
        .insert(inboundDelivery)
        .values({
          id: deliveryId,
          inboundEndpointId: params.endpointId,
          payload: payloadStr,
          headers: headersStr,
          status: "pending",
          createdAt: now,
        })
        .returning(),
      queue.add("inbound-forwarding", {
        deliveryId,
        endpoint: params.endpoint,
        payload: payloadStr,
        headers: headersStr,
      }),
    ])

    if (!result[0]) throw new Error("Failed to create inbound delivery")
    const delivery = result[0]

    return {
      ...delivery,
      payload: delivery.payload ? JSON.parse(delivery.payload) : null,
      headers: delivery.headers ? JSON.parse(delivery.headers) : null,
    }
  },
}

export const inbound = new Elysia({ prefix: "/inbound" })
  .use(withApiKey)
  .post(
    "/",
    async ({ organizationId, body, set }) => {
      set.status = 201
      return InboundService.create({
        organizationId,
        ...body,
      })
    },
    {
      body: CreateInboundEndpointBody,
      response: { 201: InboundEndpoint },
    }
  )
  .get(
    "/",
    async ({ organizationId, query }) => {
      return InboundService.getAll({
        organizationId,
        limit: query.limit ?? 20,
        offset: query.offset ?? 0,
      })
    },
    {
      query: PaginationQuery,
      response: InboundEndpointList,
    }
  )
  .get(
    "/:id",
    async ({ organizationId, params, status }) => {
      const endpoint = await InboundService.getById(organizationId, params.id)

      if (!endpoint) {
        return status(404, { error: "Inbound endpoint not found" })
      }

      return endpoint
    },
    {
      params: IdParam,
      response: {
        200: InboundEndpoint,
        404: ErrorResponse,
      },
    }
  )
  .patch(
    "/:id",
    async ({ organizationId, params, body, status }) => {
      const endpoint = await InboundService.update({
        organizationId,
        endpointId: params.id,
        ...body,
      })

      if (!endpoint) {
        return status(404, { error: "Inbound endpoint not found" })
      }

      return endpoint
    },
    {
      params: IdParam,
      body: UpdateInboundEndpointBody,
      response: {
        200: InboundEndpoint,
        404: ErrorResponse,
      },
    }
  )
  .delete(
    "/:id",
    async ({ organizationId, params }) => {
      await InboundService.delete(organizationId, params.id)

      return { success: true }
    },
    {
      params: IdParam,
      response: SuccessResponse,
    }
  )

export const inboundPublic = new Elysia({ prefix: "/in" })
  .post(
    "/:id",
    async ({ params, body, headers, status }) => {
      const endpoint = await InboundService.getByPublicId(params.id)

      if (!endpoint) {
        return status(404, { error: "Endpoint not found" })
      }

      if (!endpoint.enabled) {
        return status(403, { error: "Endpoint is disabled" })
      }

      const headerRecord: Record<string, string> = {}
      for (const [key, value] of Object.entries(headers)) {
        if (typeof value === "string") {
          headerRecord[key] = value
        }
      }

      return InboundService.receive({
        endpointId: params.id,
        endpoint: {
          id: endpoint.id,
          forwardUrl: endpoint.forwardUrl,
          secret: endpoint.secret,
          timeoutMs: endpoint.timeoutMs,
          retryCount: endpoint.retryCount,
        },
        payload: body,
        headers: headerRecord,
      })
    },
    {
      params: IdParam,
      body: t.Unknown(),
      response: {
        200: InboundDelivery,
        403: ErrorResponse,
        404: ErrorResponse,
      },
    }
  )

export { InboundService }
