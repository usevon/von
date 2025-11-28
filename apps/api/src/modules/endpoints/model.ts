import { t } from "elysia"

export namespace EndpointModel {
  export const createBody = t.Object({
    url: t.String({ format: "uri" }),
    description: t.Optional(t.String()),
    enabled: t.Optional(t.Boolean({ default: true })),
    retryCount: t.Optional(t.Number({ default: 3, minimum: 0, maximum: 10 })),
    timeoutMs: t.Optional(t.Number({ default: 30000, minimum: 1000, maximum: 60000 })),
  })

  export type createBody = typeof createBody.static

  export const updateBody = t.Object({
    url: t.Optional(t.String({ format: "uri" })),
    description: t.Optional(t.String()),
    enabled: t.Optional(t.Boolean()),
    retryCount: t.Optional(t.Number({ minimum: 0, maximum: 10 })),
    timeoutMs: t.Optional(t.Number({ minimum: 1000, maximum: 60000 })),
  })

  export type updateBody = typeof updateBody.static

  export const endpoint = t.Object({
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

  export type endpoint = typeof endpoint.static

  export const endpointList = t.Object({
    endpoints: t.Array(endpoint),
    total: t.Number(),
  })

  export type endpointList = typeof endpointList.static
}
