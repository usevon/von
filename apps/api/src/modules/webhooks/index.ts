import { Elysia } from "elysia"
import { IdParam, PaginationQuery, ErrorResponse } from "@/lib/models"
import { withAuth } from "@/modules/auth"
import { requireOrg } from "@/lib/require-org"
import { NotFoundError } from "@usevon/utils"
import { WebhookModel } from "@/modules/webhooks/model"
import { WebhookService } from "@/modules/webhooks/service"

export const webhooks = new Elysia({ prefix: "/webhooks" })
  .use(withAuth)
  .use(requireOrg)
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
      body: WebhookModel.sendBody,
      response: { 201: WebhookModel.event },
    }
  )
  .post(
    "/batch",
    async ({ organizationId, body, set }) => {
      set.status = 201
      return WebhookService.createBatch({
        organizationId,
        events: body.events,
      })
    },
    {
      body: WebhookModel.sendBatchBody,
      response: { 201: WebhookModel.batchResult },
    }
  )

export const webhookEvents = new Elysia({ prefix: "/webhooks" })
  .use(withAuth)
  .use(requireOrg)
  .get(
    "/events",
    async ({ organizationId, query }) => {
      return WebhookService.getEvents(organizationId, query.limit ?? 20, query.offset ?? 0)
    },
    {
      query: PaginationQuery,
      response: WebhookModel.eventList,
    }
  )
  .get(
    "/events/:id",
    async ({ organizationId, params }) => {
      const event = await WebhookService.getEvent(organizationId, params.id)
      if (!event) throw new NotFoundError("Event not found")
      return event
    },
    {
      params: IdParam,
      response: {
        200: WebhookModel.event,
        404: ErrorResponse,
      },
    }
  )

export { WebhookModel, WebhookService }
