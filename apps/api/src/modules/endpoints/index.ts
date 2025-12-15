import { Elysia } from "elysia"
import { IdParam, PaginationQuery, ErrorResponse, SuccessResponse } from "@/lib/models"
import { withAuth } from "@/modules/auth"
import { requireOrg } from "@/lib/require-org"
import { NotFoundError } from "@usevon/utils"
import { EndpointModel } from "@/modules/endpoints/model"
import { EndpointService } from "@/modules/endpoints/service"

export const endpoints = new Elysia({ prefix: "/endpoints" })
  .use(withAuth)
  .use(requireOrg)
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
    async ({ organizationId, params }) => {
      const endpoint = await EndpointService.getById(organizationId, params.id)
      if (!endpoint) throw new NotFoundError("Endpoint not found")
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
    async ({ organizationId, params, body }) => {
      const endpoint = await EndpointService.update({
        organizationId,
        endpointId: params.id,
        ...body,
      })
      if (!endpoint) throw new NotFoundError("Endpoint not found")
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
      response: {
        200: SuccessResponse,
        404: ErrorResponse,
      },
    }
  )

export { EndpointModel, EndpointService }
