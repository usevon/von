import { eq, and, count } from "drizzle-orm"
import { nanoid } from "nanoid"
import { db } from "@von/db"
import { inboundEndpoint, inboundDelivery } from "@von/db/schema"
import type {
  CreateInboundEndpointBodyType,
  UpdateInboundEndpointBodyType,
  InboundEndpointType,
  InboundDeliveryType,
} from "@/modules/inbound/model"

export type CreateInboundEndpointParams = CreateInboundEndpointBodyType & {
  organizationId: string
}

export type UpdateInboundEndpointParams = Partial<UpdateInboundEndpointBodyType> & {
  organizationId: string
  endpointId: string
}

export type GetInboundEndpointsParams = {
  organizationId: string
  limit: number
  offset: number
}

export type ReceiveWebhookParams = {
  endpointId: string
  payload: unknown
  headers: Record<string, string>
}

const generateSecret = () => `whsec_${nanoid(32)}`

const toEndpointResponse = (
  row: typeof inboundEndpoint.$inferSelect
): InboundEndpointType => ({
  id: row.id,
  name: row.name,
  provider: row.provider,
  secret: row.secret,
  forwardUrl: row.forwardUrl,
  enabled: row.enabled,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
})

const toDeliveryResponse = (
  row: typeof inboundDelivery.$inferSelect
): InboundDeliveryType => ({
  id: row.id,
  payload: row.payload ? JSON.parse(row.payload) : null,
  headers: row.headers ? JSON.parse(row.headers) : null,
  status: row.status,
  forwardedAt: row.forwardedAt?.toISOString() ?? null,
  responseStatus: row.responseStatus,
  createdAt: row.createdAt.toISOString(),
})

export const InboundService = {
  async create(params: CreateInboundEndpointParams): Promise<InboundEndpointType> {
    const now = new Date()

    const result = await db
      .insert(inboundEndpoint)
      .values({
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

    return toEndpointResponse(result[0])
  },

  async getAll(params: GetInboundEndpointsParams) {
    const [endpoints, totalResult] = await Promise.all([
      db
        .select()
        .from(inboundEndpoint)
        .where(eq(inboundEndpoint.organizationId, params.organizationId))
        .limit(params.limit)
        .offset(params.offset),
      db
        .select({ count: count() })
        .from(inboundEndpoint)
        .where(eq(inboundEndpoint.organizationId, params.organizationId)),
    ])

    return {
      endpoints: endpoints.map(toEndpointResponse),
      total: totalResult[0].count,
    }
  },

  async getById(
    organizationId: string,
    endpointId: string
  ): Promise<InboundEndpointType | null> {
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

    if (!result[0]) return null
    return toEndpointResponse(result[0])
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

  async update(
    params: UpdateInboundEndpointParams
  ): Promise<InboundEndpointType | null> {
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

    return toEndpointResponse(result[0])
  },

  async delete(organizationId: string, endpointId: string): Promise<boolean> {
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

  async receive(params: ReceiveWebhookParams): Promise<InboundDeliveryType> {
    const now = new Date()

    const result = await db
      .insert(inboundDelivery)
      .values({
        inboundEndpointId: params.endpointId,
        payload: JSON.stringify(params.payload),
        headers: JSON.stringify(params.headers),
        status: "received",
        createdAt: now,
      })
      .returning()

    return toDeliveryResponse(result[0])
  },
}
