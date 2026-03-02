import { t } from "elysia";
import { env } from "@/env";

const eventTypePattern = "^[a-zA-Z0-9._-]+$";

export namespace WebhookModel {
  export const sendBody = t.Object({
    eventType: t.String({ maxLength: 100, pattern: eventTypePattern }),
    payload: t.Unknown(),
    idempotencyKey: t.Optional(t.String()),
    endpointIds: t.Optional(
      t.Array(t.String({ format: "uuid" }), {
        maxItems: env.MAX_ENDPOINT_IDS_PER_REQUEST,
      })
    ),
  });

  export type sendBody = typeof sendBody.static;

  export const sendBatchBody = t.Object({
    events: t.Array(
      t.Object({
        eventType: t.String({ maxLength: 100, pattern: eventTypePattern }),
        payload: t.Unknown(),
        idempotencyKey: t.Optional(t.String()),
        endpointIds: t.Optional(
          t.Array(t.String({ format: "uuid" }), {
            maxItems: env.MAX_ENDPOINT_IDS_PER_REQUEST,
          })
        ),
      }),
      { maxItems: env.WEBHOOK_BATCH_MAX_EVENTS }
    ),
  });

  export type sendBatchBody = typeof sendBatchBody.static;

  export const event = t.Object({
    id: t.String({ format: "uuid" }),
    eventType: t.String(),
    payload: t.Unknown(),
    idempotencyKey: t.Union([t.String(), t.Null()]),
    createdAt: t.String(),
  });

  export type event = typeof event.static;

  export const eventList = t.Object({
    events: t.Array(event),
    nextCursor: t.Union([t.String(), t.Null()]),
  });

  export type eventList = typeof eventList.static;

  export const batchResult = t.Object({
    created: t.Number(),
    events: t.Array(event),
  });

  export type batchResult = typeof batchResult.static;

  export const deliveryResponse = t.Union([
    t.Object({
      status: t.Optional(t.Number()),
      durationMs: t.Number(),
      error: t.Optional(t.String()),
    }),
    t.Null(),
  ]);

  export const delivery = t.Object({
    id: t.String({ format: "uuid" }),
    eventId: t.String({ format: "uuid" }),
    endpointId: t.String({ format: "uuid" }),
    status: t.String(),
    attempts: t.Number(),
    lastAttemptAt: t.Union([t.String(), t.Null()]),
    response: deliveryResponse,
    createdAt: t.String(),
  });

  export type delivery = typeof delivery.static;

  export const deliveryAttempt = t.Object({
    id: t.String({ format: "uuid" }),
    deliveryId: t.String({ format: "uuid" }),
    eventId: t.String({ format: "uuid" }),
    endpointId: t.String({ format: "uuid" }),
    attemptNumber: t.Number(),
    outcome: t.String(),
    isFinal: t.Boolean(),
    httpStatus: t.Union([t.Number(), t.Null()]),
    error: t.Union([t.String(), t.Null()]),
    durationMs: t.Number(),
    startedAt: t.String(),
    finishedAt: t.String(),
    createdAt: t.String(),
  });

  export type deliveryAttempt = typeof deliveryAttempt.static;

  export const deliveryAttemptList = t.Object({
    attempts: t.Array(deliveryAttempt),
    nextCursor: t.Union([t.String(), t.Null()]),
  });

  export type deliveryAttemptList = typeof deliveryAttemptList.static;

  export const eventQuery = t.Object({
    eventTypes: t.Optional(
      t.Array(t.String({ maxLength: 100 }), { maxItems: 20 })
    ),
    from: t.Optional(t.String()),
    to: t.Optional(t.String()),
    sort: t.Optional(
      t.Union([t.Literal("asc"), t.Literal("desc")], { default: "desc" })
    ),
    limit: t.Optional(t.Numeric({ default: 20, minimum: 1, maximum: 100 })),
    cursor: t.Optional(t.String({ maxLength: 256 })),
  });

  export const deliveryList = t.Object({
    deliveries: t.Array(delivery),
    nextCursor: t.Union([t.String(), t.Null()]),
  });

  export type deliveryList = typeof deliveryList.static;

  export const deliveryQuery = t.Object({
    status: t.Optional(t.String()),
    endpointId: t.Optional(t.String({ format: "uuid" })),
    from: t.Optional(t.String()),
    to: t.Optional(t.String()),
    limit: t.Optional(t.Numeric({ default: 20, minimum: 1, maximum: 100 })),
    cursor: t.Optional(t.String({ maxLength: 256 })),
  });

  export const deliveryAttemptQuery = t.Object({
    sort: t.Optional(
      t.Union([t.Literal("asc"), t.Literal("desc")], { default: "asc" })
    ),
    limit: t.Optional(t.Numeric({ default: 20, minimum: 1, maximum: 100 })),
    cursor: t.Optional(t.String({ maxLength: 256 })),
  });

  export const replayBody = t.Object({
    endpointIds: t.Optional(
      t.Array(t.String({ format: "uuid" }), {
        maxItems: env.MAX_ENDPOINT_IDS_PER_REQUEST,
      })
    ),
  });

  export const bulkReplayBody = t.Object({
    since: t.String(),
    status: t.Optional(t.String()),
    endpointId: t.Optional(t.String({ format: "uuid" })),
  });

  export const replayResult = t.Object({
    replayed: t.Number(),
    deliveryIds: t.Array(t.String({ format: "uuid" })),
  });

  export type replayResult = typeof replayResult.static;

  export const bulkReplayResult = t.Object({
    replayed: t.Number(),
  });

  export type bulkReplayResult = typeof bulkReplayResult.static;
}
