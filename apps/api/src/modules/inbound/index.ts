import { Elysia, t } from "elysia"
import { IdParam, PaginationQuery, ErrorResponse, SuccessResponse } from "@/lib/models"
import { withApiKey, withSession } from "@/modules/auth"
import { InboundModel } from "./model"
import { InboundService } from "./service"

export const inbound = new Elysia({ prefix: "/inbound" })
  .use(withSession)
  .post(
    "/",
    async ({ organizationId, body, set }) => {
      set.status = 201
      return InboundService.create({
        organizationId,
        ...body,
      })
    },
    {
      body: InboundModel.createEndpointBody,
      response: { 201: InboundModel.inboundEndpoint },
    }
  )
  .get(
    "/",
    async ({ organizationId, query }) => {
      return InboundService.getAll({
        organizationId,
        limit: query.limit ?? 20,
        offset: query.offset ?? 0,
      })
    },
    {
      query: PaginationQuery,
      response: InboundModel.inboundEndpointList,
    }
  )
  .get(
    "/:id",
    async ({ organizationId, params, status }) => {
      const endpoint = await InboundService.getById(organizationId, params.id)

      if (!endpoint) {
        return status(404, { error: "Inbound endpoint not found" })
      }

      return endpoint
    },
    {
      params: IdParam,
      response: {
        200: InboundModel.inboundEndpoint,
        404: ErrorResponse,
      },
    }
  )
  .patch(
    "/:id",
    async ({ organizationId, params, body, status }) => {
      const endpoint = await InboundService.update({
        organizationId,
        endpointId: params.id,
        ...body,
      })

      if (!endpoint) {
        return status(404, { error: "Inbound endpoint not found" })
      }

      return endpoint
    },
    {
      params: IdParam,
      body: InboundModel.updateEndpointBody,
      response: {
        200: InboundModel.inboundEndpoint,
        404: ErrorResponse,
      },
    }
  )
  .delete(
    "/:id",
    async ({ organizationId, params }) => {
      await InboundService.delete(organizationId, params.id)

      return { success: true }
    },
    {
      params: IdParam,
      response: SuccessResponse,
    }
  )

export const inboundPublic = new Elysia({ prefix: "/in" })
  .post(
    "/:id",
    async ({ params, body, headers, status }) => {
      const endpoint = await InboundService.getByPublicId(params.id)

      if (!endpoint) {
        return status(404, { error: "Endpoint not found" })
      }

      if (!endpoint.enabled) {
        return status(403, { error: "Endpoint is disabled" })
      }

      const headerRecord: Record<string, string> = {}
      for (const [key, value] of Object.entries(headers)) {
        if (typeof value === "string") {
          headerRecord[key] = value
        }
      }

      return InboundService.receive({
        endpointId: params.id,
        endpoint: {
          id: endpoint.id,
          forwardUrl: endpoint.forwardUrl,
          secret: endpoint.secret,
          timeoutMs: endpoint.timeoutMs,
          retryCount: endpoint.retryCount,
        },
        payload: body,
        headers: headerRecord,
      })
    },
    {
      params: IdParam,
      body: t.Unknown(),
      response: {
        200: InboundModel.inboundDelivery,
        403: ErrorResponse,
        404: ErrorResponse,
      },
    }
  )

export { InboundModel, InboundService }
