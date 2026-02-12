import { t } from "elysia";

export namespace EndpointModel {
  export const createBody = t.Object({
    url: t.String({ format: "uri" }),
    description: t.Optional(t.String({ maxLength: 500 })),
    status: t.Optional(
      t.Union(
        [t.Literal("active"), t.Literal("paused"), t.Literal("disabled")],
        {
          default: "active",
        }
      )
    ),
    version: t.Optional(t.String({ maxLength: 50 })),
    retryCount: t.Optional(t.Number({ default: 3, minimum: 0, maximum: 10 })),
    timeoutMs: t.Optional(
      t.Number({ default: 30_000, minimum: 1000, maximum: 60_000 })
    ),
    events: t.Optional(t.Array(t.String({ maxLength: 100 }))),
  });

  export type createBody = typeof createBody.static;

  export const updateBody = t.Object({
    url: t.Optional(t.String({ format: "uri" })),
    description: t.Optional(t.String({ maxLength: 500 })),
    status: t.Optional(
      t.Union([t.Literal("active"), t.Literal("paused"), t.Literal("disabled")])
    ),
    version: t.Optional(t.Union([t.String({ maxLength: 50 }), t.Null()])),
    retryCount: t.Optional(t.Number({ minimum: 0, maximum: 10 })),
    timeoutMs: t.Optional(t.Number({ minimum: 1000, maximum: 60_000 })),
    events: t.Optional(
      t.Union([t.Array(t.String({ maxLength: 100 })), t.Null()])
    ),
  });

  export type updateBody = typeof updateBody.static;

  export const endpoint = t.Object({
    id: t.String({ format: "uuid" }),
    url: t.String(),
    description: t.Union([t.String(), t.Null()]),
    status: t.String(),
    version: t.Union([t.String(), t.Null()]),
    retryCount: t.Number(),
    timeoutMs: t.Number(),
    events: t.Union([t.Array(t.String()), t.Null()]),
    lastSuccessAt: t.Union([t.String(), t.Null()]),
    createdAt: t.String(),
    updatedAt: t.String(),
  });

  export type endpoint = typeof endpoint.static;

  export const endpointWithSecret = t.Object({
    id: t.String({ format: "uuid" }),
    url: t.String(),
    description: t.Union([t.String(), t.Null()]),
    secret: t.String(),
    status: t.String(),
    version: t.Union([t.String(), t.Null()]),
    retryCount: t.Number(),
    timeoutMs: t.Number(),
    events: t.Union([t.Array(t.String()), t.Null()]),
    lastSuccessAt: t.Union([t.String(), t.Null()]),
    createdAt: t.String(),
    updatedAt: t.String(),
  });

  export type endpointWithSecret = typeof endpointWithSecret.static;

  export const endpointList = t.Object({
    endpoints: t.Array(endpoint),
    total: t.Number(),
  });

  export type endpointList = typeof endpointList.static;

  export const testBody = t.Object({
    payload: t.Optional(t.Unknown()),
    eventType: t.Optional(t.String({ maxLength: 100 })),
  });

  export const testResponse = t.Object({
    eventId: t.String({ format: "uuid" }),
    deliveryId: t.String({ format: "uuid" }),
  });

  export type testResponse = typeof testResponse.static;

  export const rotateResponse = t.Object({
    secret: t.String(),
    previousSecret: t.String(),
  });

  export type rotateResponse = typeof rotateResponse.static;
}
