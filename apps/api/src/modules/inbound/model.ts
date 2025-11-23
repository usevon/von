import { t, type Static } from "elysia"

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
