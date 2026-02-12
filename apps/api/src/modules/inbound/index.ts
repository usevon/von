import { Elysia, t } from "elysia";
import {
  ErrorResponse,
  IdParam,
  PaginationQuery,
  SuccessResponse,
} from "@/lib/models";
import { rateLimit } from "@/lib/rate-limit";
import { checkThroughputLimit } from "@/lib/throughput-limit";
import { getOrgPlan } from "@/lib/org-plan";
import { vonAuth } from "@/modules/auth";
import { InboundModel } from "@/modules/inbound/model";
import { InboundService } from "@/modules/inbound/service";

export const inboundRead = new Elysia({ prefix: "/inbound" })
  .use(vonAuth("read:inbound"))
  .guard({ response: { 401: ErrorResponse, 403: ErrorResponse } })
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
    async ({ organizationId, params, status }) => {
      const endpoint = await InboundService.getById(organizationId, params.id);
      if (!endpoint) {
        return status(404, { error: "Endpoint not found" });
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
  );

export const inboundWrite = new Elysia({ prefix: "/inbound" })
  .use(vonAuth("write:inbound"))
  .guard({ response: { 401: ErrorResponse, 403: ErrorResponse } })
  .post(
    "/",
    async ({ organizationId, body, status }) =>
      status(
        201,
        await InboundService.create({
          organizationId,
          ...body,
        })
      ),
    {
      body: InboundModel.createEndpointBody,
      response: { 201: InboundModel.inboundEndpoint },
    }
  )
  .patch(
    "/:id",
    async ({ organizationId, params, body, status }) => {
      const endpoint = await InboundService.update({
        organizationId,
        endpointId: params.id,
        ...body,
      });
      if (!endpoint) {
        return status(404, { error: "Endpoint not found" });
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

      if (endpoint.status !== "active") {
        return status(403, { error: "Endpoint is not active" });
      }

      const plan = await getOrgPlan(endpoint.organizationId);
      const { allowed } = await checkThroughputLimit(
        endpoint.organizationId,
        plan,
        1
      );
      if (!allowed) {
        return status(429, { error: "Too many requests" });
      }

      const headerRecord: Record<string, string> = {};
      for (const [key, value] of Object.entries(headers)) {
        if (typeof value === "string") {
          headerRecord[key] = value;
        }
      }

      return InboundService.receive({
        endpointId: params.id,
        organizationId: endpoint.organizationId,
        plan,
        endpoint: {
          id: endpoint.id,
          forwardUrl: endpoint.forwardUrl,
          secret: endpoint.secret,
          previousSecret: endpoint.previousSecret,
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
        429: ErrorResponse,
      },
    }
  );
