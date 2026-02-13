import { Elysia } from "elysia";
import { ErrorResponse, IdParam } from "@/lib/models";
import { orgThroughputLimit } from "@/lib/throughput-limit";
import { vonAuth } from "@/modules/auth";
import { WebhookModel } from "@/modules/webhooks/model";
import { WebhookService } from "@/modules/webhooks/service";

export const webhooks = new Elysia({ prefix: "/webhooks" })
  .use(vonAuth("write:webhooks"))
  .use(orgThroughputLimit)
  .guard({ response: { 401: ErrorResponse, 403: ErrorResponse, 429: ErrorResponse } })
  .post(
    "/",
    async ({ organizationId, plan, body, status }) =>
      status(
        201,
        await WebhookService.createEvent({
          organizationId,
          plan,
          eventType: body.eventType,
          payload: body.payload,
          idempotencyKey: body.idempotencyKey,
          endpointIds: body.endpointIds,
        })
      ),
    {
      body: WebhookModel.sendBody,
      response: { 201: WebhookModel.event },
    }
  )
  .post(
    "/batch",
    async ({ organizationId, plan, body, status }) =>
      status(
        201,
        await WebhookService.createBatch({
          organizationId,
          plan,
          events: body.events,
        })
      ),
    {
      body: WebhookModel.sendBatchBody,
      response: { 201: WebhookModel.batchResult },
    }
  );

export const webhookEventsRead = new Elysia({ prefix: "/webhooks" })
  .use(vonAuth("read:webhooks"))
  .guard({ response: { 401: ErrorResponse, 403: ErrorResponse } })
  .get(
    "/events",
    ({ organizationId, query }) =>
      WebhookService.getEvents(
        organizationId,
        {
          eventTypes: query.eventTypes,
          from: query.from,
          to: query.to,
          sort: query.sort,
        },
        query.limit ?? 20,
        query.offset ?? 0
      ),
    {
      query: WebhookModel.eventQuery,
      response: WebhookModel.eventList,
    }
  )
  .get(
    "/events/:id",
    async ({ organizationId, params, status }) => {
      const event = await WebhookService.getEvent(organizationId, params.id);
      if (!event) {
        return status(404, { error: "Event not found" });
      }
      return event;
    },
    {
      params: IdParam,
      response: {
        200: WebhookModel.event,
        404: ErrorResponse,
      },
    }
  )
  .get(
    "/events/:id/deliveries",
    ({ organizationId, params, query }) =>
      WebhookService.getDeliveries(
        organizationId,
        params.id,
        {
          status: query.status,
          endpointId: query.endpointId,
          from: query.from,
          to: query.to,
        },
        query.limit ?? 20,
        query.offset ?? 0
      ),
    {
      params: IdParam,
      query: WebhookModel.deliveryQuery,
      response: WebhookModel.deliveryList,
    }
  );

export const webhookEventsWrite = new Elysia({ prefix: "/webhooks" })
  .use(vonAuth("write:webhooks"))
  .use(orgThroughputLimit)
  .guard({ response: { 401: ErrorResponse, 403: ErrorResponse, 429: ErrorResponse } })
  .post(
    "/events/:id/replay",
    async ({ organizationId, plan, params, body }) =>
      WebhookService.replayEvent(
        organizationId,
        params.id,
        plan,
        body.endpointIds
      ),
    {
      params: IdParam,
      body: WebhookModel.replayBody,
      response: {
        200: WebhookModel.replayResult,
        404: ErrorResponse,
      },
    }
  )
  .post(
    "/events/replay",
    async ({ organizationId, plan, body }) =>
      WebhookService.replayBulk(organizationId, body.since, plan, {
        status: body.status,
        endpointId: body.endpointId,
      }),
    {
      body: WebhookModel.bulkReplayBody,
      response: WebhookModel.bulkReplayResult,
    }
  );
