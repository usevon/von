import { NotFoundError } from "@usevon/utils";
import { Elysia } from "elysia";
import { ErrorResponse, IdParam, PaginationQuery } from "@/lib/models";
import { requireOrg } from "@/modules/auth";
import { WebhookModel } from "@/modules/webhooks/model";
import { WebhookService } from "@/modules/webhooks/service";

export const webhooks = new Elysia({ prefix: "/webhooks" })
  .use(requireOrg)
  .post(
    "/",
    ({ organizationId, body, set }) => {
      set.status = 201;
      return WebhookService.createEvent({
        organizationId,
        eventType: body.eventType,
        payload: body.payload,
        idempotencyKey: body.idempotencyKey,
        endpointIds: body.endpointIds,
      });
    },
    {
      body: WebhookModel.sendBody,
      response: { 201: WebhookModel.event },
    }
  )
  .post(
    "/batch",
    ({ organizationId, body, set }) => {
      set.status = 201;
      return WebhookService.createBatch({
        organizationId,
        events: body.events,
      });
    },
    {
      body: WebhookModel.sendBatchBody,
      response: { 201: WebhookModel.batchResult },
    }
  );

export const webhookEvents = new Elysia({ prefix: "/webhooks" })
  .use(requireOrg)
  .get(
    "/events",
    ({ organizationId, query }) =>
      WebhookService.getEvents(
        organizationId,
        query.limit ?? 20,
        query.offset ?? 0
      ),
    {
      query: PaginationQuery,
      response: WebhookModel.eventList,
    }
  )
  .get(
    "/events/:id",
    async ({ organizationId, params }) => {
      const event = await WebhookService.getEvent(organizationId, params.id);
      if (!event) {
        throw new NotFoundError("Event not found");
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
  );
