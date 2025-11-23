import { Elysia, t } from "elysia"
import {
  CreateInboundEndpointBody,
  UpdateInboundEndpointBody,
  InboundEndpoint,
  InboundEndpointList,
  InboundDelivery,
} from "@/modules/inbound/model"
import { InboundService } from "@/modules/inbound/service"
import { IdParam, PaginationQuery, ErrorResponse, SuccessResponse } from "@/lib/models"
import { withApiKey } from "@/modules/auth"

export const inboundManagement = new Elysia({ prefix: "/inbound" })
  .use(withApiKey)
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
      body: CreateInboundEndpointBody,
      response: { 201: InboundEndpoint },
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
      response: InboundEndpointList,
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
        200: InboundEndpoint,
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
      body: UpdateInboundEndpointBody,
      response: {
        200: InboundEndpoint,
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

export const inboundReceiver = new Elysia({ prefix: "/in" })
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
        payload: body,
        headers: headerRecord,
      })
    },
    {
      params: IdParam,
      body: t.Unknown(),
      response: {
        200: InboundDelivery,
        403: ErrorResponse,
        404: ErrorResponse,
      },
    }
  )
