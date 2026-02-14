import { Elysia } from "elysia";
import {
  ErrorResponse,
  IdParam,
  PaginationQuery,
  SuccessResponse,
} from "@/lib/models";
import { orNotFound } from "@/lib/http";
import { toCursorPageInput } from "@/lib/pagination";
import { orgThroughputLimit } from "@/lib/throughput-limit";
import { vonAuth } from "@/modules/auth";
import { EndpointModel } from "@/modules/endpoints/model";
import { EndpointService } from "@/modules/endpoints/service";

export const endpointsRead = new Elysia({ prefix: "/endpoints" })
  .use(vonAuth("read:endpoints"))
  .guard({ response: { 401: ErrorResponse, 403: ErrorResponse } })
  .get(
    "/",
    ({ organizationId, query }) =>
      EndpointService.getAll(organizationId, toCursorPageInput(query)),
    {
      query: PaginationQuery,
      response: EndpointModel.endpointList,
    }
  )
  .get(
    "/:id",
    async ({ organizationId, params, status }) =>
      orNotFound(
        await EndpointService.getById(organizationId, params.id),
        status,
        "Endpoint not found"
      ),
    {
      params: IdParam,
      response: {
        200: EndpointModel.endpoint,
        404: ErrorResponse,
      },
    }
  );

export const endpointsWrite = new Elysia({ prefix: "/endpoints" })
  .use(vonAuth("write:endpoints"))
  .use(orgThroughputLimit)
  .guard({
    response: { 401: ErrorResponse, 403: ErrorResponse, 429: ErrorResponse },
  })
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
      response: { 201: EndpointModel.endpointWithSecret },
    }
  )
  .patch(
    "/:id",
    async ({ organizationId, params, body, status }) =>
      orNotFound(
        await EndpointService.update({
          organizationId,
          endpointId: params.id,
          ...body,
        }),
        status,
        "Endpoint not found"
      ),
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
      EndpointService.testEndpoint({
        organizationId,
        endpointId: params.id,
        plan,
        payload: body.payload,
        eventType: body.eventType,
      }),
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
