import { Elysia } from "elysia"
import { IdParam, PaginationQuery, ErrorResponse, SuccessResponse } from "@/lib/models"
import { withAuth } from "@/modules/auth"
import { BadRequestError } from "@usevon/utils"
import { EndpointModel } from "./model"
import { EndpointService } from "./service"

export const endpoints = new Elysia({ prefix: "/endpoints" })
  .use(withAuth)
  .post(
    "/",
    async ({ organizationId, body, set }) => {
      if (!organizationId) throw new BadRequestError("No active organization")
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
      if (!organizationId) return { endpoints: [], total: 0 }
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
      if (!organizationId) return status(404, { error: "Endpoint not found" })
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
      if (!organizationId) return status(404, { error: "Endpoint not found" })
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
    async ({ organizationId, params, status }) => {
      if (!organizationId) return status(404, { error: "Endpoint not found" })
      await EndpointService.delete(organizationId, params.id)

      return { success: true }
    },
    {
      params: IdParam,
      response: {
        200: SuccessResponse,
        404: ErrorResponse,
      },
    }
  )

export { EndpointModel, EndpointService }
