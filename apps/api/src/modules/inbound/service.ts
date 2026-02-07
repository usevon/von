import { db } from "@usevon/db";
import { inboundDelivery, inboundEndpoint } from "@usevon/db/schema";
import { getInboundForwardingQueue, getRedisClient } from "@usevon/queue";
import {
  BadRequestError,
  InternalServerError,
  generateId,
  generateSecret,
  isValidWebhookUrl,
  toISODates,
} from "@usevon/utils";
import { and, eq } from "drizzle-orm";
import { withServiceError } from "@/lib/service-utils";
import type { InboundModel } from "@/modules/inbound/model";

const redis = getRedisClient();
const CACHE_TTL = 300; // 5 minutes

type InboundEndpointRow = typeof inboundEndpoint.$inferSelect;

type CreateInboundEndpointParams = {
  organizationId: string;
  name?: string;
  provider?: string;
  forwardUrl: string;
  enabled?: boolean;
};

type UpdateInboundEndpointParams = {
  organizationId: string;
  endpointId: string;
  name?: string;
  provider?: string;
  forwardUrl?: string;
  enabled?: boolean;
};

type ReceiveWebhookParams = {
  endpointId: string;
  endpoint: {
    id: string;
    forwardUrl: string;
    secret: string;
    timeoutMs: number;
    retryCount: number;
  };
  payload: unknown;
  headers: Record<string, string>;
};

export abstract class InboundService {
  static create(
    params: CreateInboundEndpointParams
  ): Promise<InboundModel.inboundEndpoint> {
    return withServiceError(async () => {
      if (!isValidWebhookUrl(params.forwardUrl)) {
        throw new BadRequestError(
          "Invalid forward URL: must be http(s) and not target private networks"
        );
      }

      const now = new Date();

      const result = await db
        .insert(inboundEndpoint)
        .values({
          id: generateId(),
          organizationId: params.organizationId,
          name: params.name ?? null,
          provider: params.provider ?? null,
          secret: generateSecret(),
          forwardUrl: params.forwardUrl,
          enabled: params.enabled ?? true,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      if (!result[0]) {
        throw new InternalServerError("Failed to create inbound endpoint");
      }
      return toISODates(result[0]) as InboundModel.inboundEndpoint;
    }, "creating inbound endpoint");
  }

  static getAll(
    organizationId: string,
    limit: number,
    offset: number
  ): Promise<InboundModel.inboundEndpointList> {
    return withServiceError(async () => {
      const [endpoints, total] = await Promise.all([
        db
          .select()
          .from(inboundEndpoint)
          .where(eq(inboundEndpoint.organizationId, organizationId))
          .limit(limit)
          .offset(offset),
        db.$count(
          inboundEndpoint,
          eq(inboundEndpoint.organizationId, organizationId)
        ),
      ]);
      return { endpoints: endpoints.map((e) => toISODates(e) as InboundModel.inboundEndpoint), total };
    }, "fetching inbound endpoints");
  }

  static getById(
    organizationId: string,
    endpointId: string
  ): Promise<InboundModel.inboundEndpoint | null> {
    return withServiceError(async () => {
      const result = await db
        .select()
        .from(inboundEndpoint)
        .where(
          and(
            eq(inboundEndpoint.id, endpointId),
            eq(inboundEndpoint.organizationId, organizationId)
          )
        )
        .limit(1);

      return result[0] ? toISODates(result[0]) as InboundModel.inboundEndpoint : null;
    }, "fetching inbound endpoint");
  }

  static getByPublicId(endpointId: string): Promise<InboundEndpointRow | null> {
    return withServiceError(async () => {
      const cached = await redis.get(`inbound:${endpointId}`);
      if (cached) {
        return JSON.parse(cached) as InboundEndpointRow;
      }

      const result = await db
        .select()
        .from(inboundEndpoint)
        .where(eq(inboundEndpoint.id, endpointId))
        .limit(1);

      if (result[0]) {
        await redis.setex(
          `inbound:${endpointId}`,
          CACHE_TTL,
          JSON.stringify(result[0])
        );
      }

      return result[0] ?? null;
    }, "fetching inbound endpoint");
  }

  static update(
    params: UpdateInboundEndpointParams
  ): Promise<InboundModel.inboundEndpoint | null> {
    return withServiceError(async () => {
      if (params.forwardUrl && !isValidWebhookUrl(params.forwardUrl)) {
        throw new BadRequestError(
          "Invalid forward URL: must be http(s) and not target private networks"
        );
      }

      const existing = await db
        .select()
        .from(inboundEndpoint)
        .where(
          and(
            eq(inboundEndpoint.id, params.endpointId),
            eq(inboundEndpoint.organizationId, params.organizationId)
          )
        )
        .limit(1);

      if (!existing[0]) {
        return null;
      }

      const result = await db
        .update(inboundEndpoint)
        .set({
          name: params.name ?? existing[0].name,
          provider: params.provider ?? existing[0].provider,
          forwardUrl: params.forwardUrl ?? existing[0].forwardUrl,
          enabled: params.enabled ?? existing[0].enabled,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(inboundEndpoint.id, params.endpointId),
            eq(inboundEndpoint.organizationId, params.organizationId)
          )
        )
        .returning();

      if (!result[0]) {
        throw new InternalServerError("Failed to update inbound endpoint");
      }
      await redis.del(`inbound:${params.endpointId}`);
      return toISODates(result[0]) as InboundModel.inboundEndpoint;
    }, "updating inbound endpoint");
  }

  static delete(organizationId: string, endpointId: string): Promise<boolean> {
    return withServiceError(async () => {
      const result = await db
        .delete(inboundEndpoint)
        .where(
          and(
            eq(inboundEndpoint.id, endpointId),
            eq(inboundEndpoint.organizationId, organizationId)
          )
        )
        .returning({ id: inboundEndpoint.id });

      if (result.length > 0) {
        await redis.del(`inbound:${endpointId}`);
      }
      return result.length > 0;
    }, "deleting inbound endpoint");
  }

  static receive(
    params: ReceiveWebhookParams
  ): Promise<InboundModel.inboundDelivery> {
    return withServiceError(async () => {
      const now = new Date();
      const deliveryId = generateId();
      const payloadStr = JSON.stringify(params.payload);
      const headersStr = JSON.stringify(params.headers);

      const delivery = await db.transaction(async (tx) => {
        const result = await tx
          .insert(inboundDelivery)
          .values({
            id: deliveryId,
            inboundEndpointId: params.endpointId,
            payload: payloadStr,
            headers: headersStr,
            status: "pending",
            createdAt: now,
          })
          .returning();

        if (!result[0]) {
          throw new InternalServerError("Failed to create inbound delivery");
        }
        return result[0];
      });

      const queue = getInboundForwardingQueue();
      await queue.add("inbound-forwarding", {
        deliveryId,
        endpoint: params.endpoint,
        payload: payloadStr,
        headers: headersStr,
      });

      return {
        id: delivery.id,
        payload: delivery.payload ? JSON.parse(delivery.payload) : null,
        headers: delivery.headers ? JSON.parse(delivery.headers) : null,
        status: delivery.status,
        forwardedAt: delivery.forwardedAt?.toISOString() ?? null,
        responseStatus: delivery.responseStatus,
        createdAt: delivery.createdAt.toISOString(),
      };
    }, "receiving webhook");
  }
}
