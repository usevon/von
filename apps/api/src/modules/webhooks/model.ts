import { t } from "elysia";
import { env } from "@/env";

const eventTypePattern = "^[a-zA-Z0-9._-]+$";

export namespace WebhookModel {
  export const sendBody = t.Object({
    eventType: t.String({ maxLength: 100, pattern: eventTypePattern }),
    payload: t.Unknown(),
    idempotencyKey: t.Optional(t.String()),
    endpointIds: t.Optional(t.Array(t.String({ format: "uuid" }))),
  });

  export type sendBody = typeof sendBody.static;

  export const sendBatchBody = t.Object({
    events: t.Array(
      t.Object({
        eventType: t.String({ maxLength: 100, pattern: eventTypePattern }),
        payload: t.Unknown(),
        idempotencyKey: t.Optional(t.String()),
        endpointIds: t.Optional(t.Array(t.String({ format: "uuid" }))),
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
    status: t.String(),
    createdAt: t.String(),
  });

  export type event = typeof event.static;

  export const eventList = t.Object({
    events: t.Array(event),
    total: t.Number(),
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

  export const deliveryList = t.Object({
    deliveries: t.Array(delivery),
    total: t.Number(),
  });

  export type deliveryList = typeof deliveryList.static;

  export const deliveryQuery = t.Object({
    status: t.Optional(t.String()),
    endpointId: t.Optional(t.String({ format: "uuid" })),
    from: t.Optional(t.String()),
    to: t.Optional(t.String()),
    limit: t.Optional(t.Numeric({ default: 20, maximum: 100 })),
    offset: t.Optional(t.Numeric({ default: 0, minimum: 0 })),
  });

  export const replayBody = t.Object({
    endpointIds: t.Optional(t.Array(t.String({ format: "uuid" }))),
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
