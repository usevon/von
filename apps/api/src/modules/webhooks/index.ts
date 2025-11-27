import { Elysia } from "elysia"
import { IdParam, PaginationQuery, ErrorResponse } from "@/lib/models"
import { withApiKey, withSession } from "@/modules/auth"
import { WebhookModel } from "./model"
import { WebhookService } from "./service"

export const webhooks = new Elysia({ prefix: "/webhooks" })
  .group("", (app) =>
    app
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
  )
  .group("", (app) =>
    app
      .use(withSession)
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
            200: WebhookModel.event,
            404: ErrorResponse,
          },
        }
      )
  )

export { WebhookModel, WebhookService }
