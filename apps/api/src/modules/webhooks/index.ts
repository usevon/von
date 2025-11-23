import { Elysia } from "elysia"
import { SendWebhookBody, WebhookEvent, WebhookEventList } from "@/modules/webhooks/model"
import { WebhookService } from "@/modules/webhooks/service"
import { IdParam, PaginationQuery, ErrorResponse } from "@/lib/models"
import { withApiKey } from "@/modules/auth"

export const webhooks = new Elysia({ prefix: "/webhooks" })
  .use(withApiKey)
  .post(
    "/",
    async ({ organizationId, body, set }) => {
      set.status = 201
      return WebhookService.createEvent({
        organizationId,
        eventType: body.eventType,
        payload: body.payload,
        idempotencyKey: body.idempotencyKey,
        endpointIds: body.endpointIds,
      })
    },
    {
      body: SendWebhookBody,
      response: { 201: WebhookEvent },
    }
  )
  .get(
    "/events",
    async ({ organizationId, query }) => {
      return WebhookService.getEvents({
        organizationId,
        limit: query.limit ?? 20,
        offset: query.offset ?? 0,
      })
    },
    {
      query: PaginationQuery,
      response: WebhookEventList,
    }
  )
  .get(
    "/events/:id",
    async ({ organizationId, params, status }) => {
      const event = await WebhookService.getEvent(organizationId, params.id)

      if (!event) {
        return status(404, { error: "Event not found" })
      }

      return event
    },
    {
      params: IdParam,
      response: {
        200: WebhookEvent,
        404: ErrorResponse,
      },
    }
  )
