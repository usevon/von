import { t } from "elysia";

export namespace InboundModel {
  export const createEndpointBody = t.Object({
    name: t.Optional(t.String({ maxLength: 255 })),
    provider: t.Optional(t.String({ maxLength: 100 })),
    forwardUrl: t.String({ format: "uri" }),
    enabled: t.Optional(t.Boolean({ default: true })),
  });

  export type createEndpointBody = typeof createEndpointBody.static;

  export const updateEndpointBody = t.Object({
    name: t.Optional(t.String({ maxLength: 255 })),
    provider: t.Optional(t.String({ maxLength: 100 })),
    forwardUrl: t.Optional(t.String({ format: "uri" })),
    enabled: t.Optional(t.Boolean()),
  });

  export type updateEndpointBody = typeof updateEndpointBody.static;

  export const inboundEndpoint = t.Object({
    id: t.String({ format: "uuid" }),
    name: t.Union([t.String(), t.Null()]),
    provider: t.Union([t.String(), t.Null()]),
    secret: t.String(),
    forwardUrl: t.String(),
    enabled: t.Boolean(),
    createdAt: t.String(),
    updatedAt: t.String(),
  });

  export type inboundEndpoint = typeof inboundEndpoint.static;

  export const inboundEndpointList = t.Object({
    endpoints: t.Array(inboundEndpoint),
    total: t.Number(),
  });

  export type inboundEndpointList = typeof inboundEndpointList.static;

  export const inboundDelivery = t.Object({
    id: t.String({ format: "uuid" }),
    payload: t.Unknown(),
    headers: t.Union([t.Record(t.String(), t.String()), t.Null()]),
    status: t.String(),
    forwardedAt: t.Union([t.String(), t.Null()]),
    responseStatus: t.Union([t.Number(), t.Null()]),
    createdAt: t.String(),
  });

  export type inboundDelivery = typeof inboundDelivery.static;
}
