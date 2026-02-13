import { t } from "elysia";

export namespace InboundModel {
  export const createEndpointBody = t.Object({
    name: t.Optional(t.String({ maxLength: 255 })),
    provider: t.Optional(t.String({ maxLength: 100 })),
    forwardUrl: t.String({ format: "uri" }),
    status: t.Optional(
      t.Union(
        [t.Literal("active"), t.Literal("paused"), t.Literal("disabled")],
        {
          default: "active",
        }
      )
    ),
  });

  export type createEndpointBody = typeof createEndpointBody.static;

  export const updateEndpointBody = t.Object({
    name: t.Optional(t.String({ maxLength: 255 })),
    provider: t.Optional(t.String({ maxLength: 100 })),
    forwardUrl: t.Optional(t.String({ format: "uri" })),
    status: t.Optional(
      t.Union([t.Literal("active"), t.Literal("paused"), t.Literal("disabled")])
    ),
  });

  export type updateEndpointBody = typeof updateEndpointBody.static;

  export const inboundEndpoint = t.Object({
    id: t.String({ format: "uuid" }),
    name: t.Union([t.String(), t.Null()]),
    provider: t.Union([t.String(), t.Null()]),
    secret: t.String(),
    forwardUrl: t.String(),
    status: t.String(),
    lastSuccessAt: t.Union([t.String(), t.Null()]),
    createdAt: t.String(),
    updatedAt: t.String(),
  });

  export type inboundEndpoint = typeof inboundEndpoint.static;

  export const inboundEndpointList = t.Object({
    endpoints: t.Array(inboundEndpoint),
    nextCursor: t.Union([t.String(), t.Null()]),
  });

  export type inboundEndpointList = typeof inboundEndpointList.static;

  export const inboundDelivery = t.Object({
    id: t.String({ format: "uuid" }),
    payload: t.Unknown(),
    headers: t.Union([t.Record(t.String(), t.String()), t.Null()]),
    status: t.String(),
    forwardedAt: t.Union([t.String(), t.Null()]),
    response: t.Union([
      t.Object({
        status: t.Optional(t.Number()),
        durationMs: t.Number(),
        error: t.Optional(t.String()),
      }),
      t.Null(),
    ]),
    createdAt: t.String(),
  });

  export type inboundDelivery = typeof inboundDelivery.static;
}
