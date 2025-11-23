import { t, type Static } from "elysia"

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
