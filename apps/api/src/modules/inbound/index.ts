import { NotFoundError } from "@usevon/utils";
import { Elysia, t } from "elysia";
import {
  ErrorResponse,
  IdParam,
  PaginationQuery,
  SuccessResponse,
} from "@/lib/models";
import { rateLimit } from "@/lib/rate-limit";
import { requireOrg } from "@/modules/auth";
import { InboundModel } from "@/modules/inbound/model";
import { InboundService } from "@/modules/inbound/service";

export const inbound = new Elysia({ prefix: "/inbound" })
  .use(requireOrg)
  .post(
    "/",
    ({ organizationId, body, set }) => {
      set.status = 201;
      return InboundService.create({
        organizationId,
        ...body,
      });
    },
    {
      body: InboundModel.createEndpointBody,
      response: { 201: InboundModel.inboundEndpoint },
    }
  )
  .get(
    "/",
    ({ organizationId, query }) =>
      InboundService.getAll(
        organizationId,
        query.limit ?? 20,
        query.offset ?? 0
      ),
    {
      query: PaginationQuery,
      response: InboundModel.inboundEndpointList,
    }
  )
  .get(
    "/:id",
    async ({ organizationId, params }) => {
      const endpoint = await InboundService.getById(organizationId, params.id);
      if (!endpoint) {
        throw new NotFoundError("Inbound endpoint not found");
      }
      return endpoint;
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
    async ({ organizationId, params, body }) => {
      const endpoint = await InboundService.update({
        organizationId,
        endpointId: params.id,
        ...body,
      });
      if (!endpoint) {
        throw new NotFoundError("Inbound endpoint not found");
      }
      return endpoint;
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
      await InboundService.delete(organizationId, params.id);
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

const MAX_PAYLOAD_SIZE = 1_000_000; // 1MB

export const inboundPublic = new Elysia({ prefix: "/in" })
  .use(rateLimit({ windowMs: 60_000, max: 100, keyPrefix: "rl:inbound" }))
  .post(
    "/:id",
    async ({ params, body, headers, status }) => {
      const payloadSize = JSON.stringify(body).length;
      if (payloadSize > MAX_PAYLOAD_SIZE) {
        return status(413, { error: "Payload exceeds 1MB limit" });
      }

      const endpoint = await InboundService.getByPublicId(params.id);

      if (!endpoint) {
        return status(404, { error: "Endpoint not found" });
      }

      if (!endpoint.enabled) {
        return status(403, { error: "Endpoint is disabled" });
      }

      const headerRecord: Record<string, string> = {};
      for (const [key, value] of Object.entries(headers)) {
        if (typeof value === "string") {
          headerRecord[key] = value;
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
      });
    },
    {
      params: IdParam,
      body: t.Unknown(),
      response: {
        200: InboundModel.inboundDelivery,
        403: ErrorResponse,
        404: ErrorResponse,
        413: ErrorResponse,
      },
    }
  );
