import { Elysia } from "elysia"
import { IdParam, PaginationQuery, ErrorResponse, SuccessResponse } from "@/lib/models"
import { withApiKey } from "@/modules/auth"
import { EndpointModel } from "./model"
import { EndpointService } from "./service"

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
      body: EndpointModel.createBody,
      response: { 201: EndpointModel.endpoint },
    }
  )
  .get(
    "/",
    async ({ organizationId, query }) => {
      return EndpointService.getAll(organizationId, query.limit ?? 20, query.offset ?? 0)
    },
    {
      query: PaginationQuery,
      response: EndpointModel.endpointList,
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
        200: EndpointModel.endpoint,
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
      body: EndpointModel.updateBody,
      response: {
        200: EndpointModel.endpoint,
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

export { EndpointModel, EndpointService }
