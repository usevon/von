import type { WebhookEvent, WebhookDelivery, SendEvent, SendBatch } from "@usevon/types";
import { t } from "elysia";

const eventTypePattern = "^[a-zA-Z0-9._-]+$";

export namespace WebhookModel {
  export const sendBody = t.Object({
    eventType: t.String({ maxLength: 100, pattern: eventTypePattern }),
    payload: t.Unknown(),
    idempotencyKey: t.Optional(t.String()),
    endpointIds: t.Optional(t.Array(t.String({ format: "uuid" }))),
  });

  export type sendBody = SendEvent;

  export const sendBatchBody = t.Object({
    events: t.Array(
      t.Object({
        eventType: t.String({ maxLength: 100, pattern: eventTypePattern }),
        payload: t.Unknown(),
        idempotencyKey: t.Optional(t.String()),
        endpointIds: t.Optional(t.Array(t.String({ format: "uuid" }))),
      })
    ),
  });

  export type sendBatchBody = SendBatch;

  export const event = t.Object({
    id: t.String({ format: "uuid" }),
    eventType: t.String(),
    payload: t.Unknown(),
    idempotencyKey: t.Union([t.String(), t.Null()]),
    status: t.String(),
    createdAt: t.String(),
  });

  export type event = WebhookEvent;

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

  export const delivery = t.Object({
    id: t.String({ format: "uuid" }),
    eventId: t.String({ format: "uuid" }),
    endpointId: t.String({ format: "uuid" }),
    status: t.String(),
    attempts: t.Number(),
    lastAttemptAt: t.Union([t.String(), t.Null()]),
    responseStatus: t.Union([t.Number(), t.Null()]),
    createdAt: t.String(),
  });

  export type delivery = WebhookDelivery;
}
