import { Elysia, t } from "elysia";
import { env } from "@/env";
import { toStringHeaders } from "@/lib/headers";
import { orNotFound } from "@/lib/http";
import {
  ErrorResponse,
  IdParam,
  PaginationQuery,
  ReadGuard,
  SuccessResponse,
  WriteGuard,
} from "@/lib/models";
import { getOrgPlan } from "@/lib/org-plan";
import { toCursorPageInput } from "@/lib/pagination";
import { rateLimit } from "@/lib/rate-limit";
import { vonAuth } from "@/modules/auth";
import { InboundModel } from "@/modules/inbound/model";
import { InboundService } from "@/modules/inbound/service";

export const inboundRead = new Elysia({ prefix: "/inbound" })
  .use(vonAuth("read:inbound"))
  .guard({ response: ReadGuard })
  .get(
    "/",
    ({ organizationId, query }) =>
      InboundService.getAll(organizationId, toCursorPageInput(query)),
    {
      query: PaginationQuery,
      response: InboundModel.inboundEndpointList,
    }
  )
  .get(
    "/:id",
    async ({ organizationId, params, status }) =>
      orNotFound(
        await InboundService.getById(organizationId, params.id),
        status,
        "Endpoint not found"
      ),
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
  .guard({ response: WriteGuard })
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
    async ({ organizationId, params, body, status }) =>
      orNotFound(
        await InboundService.update({
          organizationId,
          endpointId: params.id,
          ...body,
        }),
        status,
        "Endpoint not found"
      ),
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

const MAX_PAYLOAD_SIZE = env.API_MAX_BODY_BYTES;

export const inboundPublic = new Elysia({ prefix: "/in" })
  .use(
    rateLimit({
      windowMs: 60_000,
      max: 100,
      keyPrefix: "rl:inbound",
      failOpen: env.NODE_ENV !== "production",
    })
  )
  .post(
    "/:id",
    async ({ params, body, headers, status }) => {
      const payloadSize = JSON.stringify(body).length;
      if (payloadSize > MAX_PAYLOAD_SIZE) {
        return status(413, {
          error: `Payload exceeds ${MAX_PAYLOAD_SIZE} byte limit`,
        });
      }

      const endpoint = await InboundService.getByPublicId(params.id);

      if (!endpoint) {
        return status(404, { error: "Endpoint not found" });
      }

      if (endpoint.status !== "active") {
        return status(403, { error: "Endpoint is not active" });
      }

      const plan = await getOrgPlan(endpoint.organizationId);

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
          maxAttempts: endpoint.maxAttempts,
        },
        payload: body,
        headers: toStringHeaders(headers),
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
