import { NotFoundError } from "@usevon/utils";
import { Elysia } from "elysia";
import {
  ErrorResponse,
  IdParam,
  PaginationQuery,
  SuccessResponse,
} from "@/lib/models";
import { orgThroughputLimit } from "@/lib/throughput-limit";
import { requireScope } from "@/modules/auth";
import { EndpointModel } from "@/modules/endpoints/model";
import { EndpointService } from "@/modules/endpoints/service";

export const endpointsRead = new Elysia({ prefix: "/endpoints" })
  .use(requireScope("read:endpoints"))
  .get(
    "/",
    ({ organizationId, query }) =>
      EndpointService.getAll(
        organizationId,
        query.limit ?? 20,
        query.offset ?? 0
      ),
    {
      query: PaginationQuery,
      response: EndpointModel.endpointList,
    }
  )
  .get(
    "/:id",
    async ({ organizationId, params }) => {
      const endpoint = await EndpointService.getById(organizationId, params.id);
      if (!endpoint) {
        throw new NotFoundError();
      }
      return endpoint;
    },
    {
      params: IdParam,
      response: {
        200: EndpointModel.endpoint,
        404: ErrorResponse,
      },
    }
  );

export const endpointsWrite = new Elysia({ prefix: "/endpoints" })
  .use(requireScope("write:endpoints"))
  .use(orgThroughputLimit)
  .post(
    "/",
    async ({ organizationId, body, status }) =>
      status(
        201,
        await EndpointService.create({
          organizationId,
          ...body,
        })
      ),
    {
      body: EndpointModel.createBody,
      response: { 201: EndpointModel.endpoint },
    }
  )
  .patch(
    "/:id",
    async ({ organizationId, params, body }) => {
      const endpoint = await EndpointService.update({
        organizationId,
        endpointId: params.id,
        ...body,
      });
      if (!endpoint) {
        throw new NotFoundError();
      }
      return endpoint;
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
      await EndpointService.delete(organizationId, params.id);
      return { success: true };
    },
    {
      params: IdParam,
      response: {
        200: SuccessResponse,
        404: ErrorResponse,
      },
    }
  )
  .post(
    "/:id/test",
    async ({ organizationId, plan, params, body }) =>
      EndpointService.testEndpoint(
        organizationId,
        params.id,
        plan,
        body.payload,
        body.eventType
      ),
    {
      params: IdParam,
      body: EndpointModel.testBody,
      response: {
        200: EndpointModel.testResponse,
        404: ErrorResponse,
      },
    }
  )
  .post(
    "/:id/rotate",
    async ({ organizationId, params }) =>
      EndpointService.rotateSecret(organizationId, params.id),
    {
      params: IdParam,
      response: {
        200: EndpointModel.rotateResponse,
        404: ErrorResponse,
      },
    }
  )
  .delete(
    "/:id/previous-secret",
    async ({ organizationId, params }) => {
      await EndpointService.clearPreviousSecret(organizationId, params.id);
      return { success: true };
    },
    {
      params: IdParam,
      response: {
        200: SuccessResponse,
        404: ErrorResponse,
      },
    }
  );
