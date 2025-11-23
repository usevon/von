import { Elysia } from "elysia"
import { CreateEndpointBody, UpdateEndpointBody, Endpoint, EndpointList } from "@/modules/endpoints/model"
import { EndpointService } from "@/modules/endpoints/service"
import { IdParam, PaginationQuery, ErrorResponse, SuccessResponse } from "@/lib/models"
import { withApiKey } from "@/modules/auth"

export const endpoints = new Elysia({ prefix: "/endpoints" })
  .use(withApiKey)
  .post(
    "/",
    async ({ organizationId, body, set }) => {
      set.status = 201
      return EndpointService.create({
        organizationId,
        ...body,
      })
    },
    {
      body: CreateEndpointBody,
      response: { 201: Endpoint },
    }
  )
  .get(
    "/",
    async ({ organizationId, query }) => {
      return EndpointService.getAll({
        organizationId,
        limit: query.limit ?? 20,
        offset: query.offset ?? 0,
      })
    },
    {
      query: PaginationQuery,
      response: EndpointList,
    }
  )
  .get(
    "/:id",
    async ({ organizationId, params, status }) => {
      const endpoint = await EndpointService.getById(organizationId, params.id)

      if (!endpoint) {
        return status(404, { error: "Endpoint not found" })
      }

      return endpoint
    },
    {
      params: IdParam,
      response: {
        200: Endpoint,
        404: ErrorResponse,
      },
    }
  )
  .patch(
    "/:id",
    async ({ organizationId, params, body, status }) => {
      const endpoint = await EndpointService.update({
        organizationId,
        endpointId: params.id,
        ...body,
      })

      if (!endpoint) {
        return status(404, { error: "Endpoint not found" })
      }

      return endpoint
    },
    {
      params: IdParam,
      body: UpdateEndpointBody,
      response: {
        200: Endpoint,
        404: ErrorResponse,
      },
    }
  )
  .delete(
    "/:id",
    async ({ organizationId, params }) => {
      await EndpointService.delete(organizationId, params.id)

      return { success: true }
    },
    {
      params: IdParam,
      response: SuccessResponse,
    }
  )
