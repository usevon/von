import { db } from "@usevon/db";
import { endpoint } from "@usevon/db/schema";
import { type DeliveryEndpoint, getRedisClient } from "@usevon/queue";
import {
  BadRequestError,
  generateId,
  generateSecret,
  isValidWebhookUrl,
  toISODates,
} from "@usevon/utils";
import { and, eq, inArray } from "drizzle-orm";
import { withServiceError } from "@/lib/service-utils";
import type { EndpointModel } from "@/modules/endpoints/model";

const redis = getRedisClient();
const CACHE_TTL = 300; // 5 minutes

type EndpointFields = {
  url: string;
  description?: string;
  enabled?: boolean;
  version?: string | null;
  retryCount?: number;
  timeoutMs?: number;
};

type CreateEndpointParams = EndpointFields & { organizationId: string };
type UpdateEndpointParams = Partial<EndpointFields> & {
  organizationId: string;
  endpointId: string;
};

const toEndpoint = (e: typeof endpoint.$inferSelect): EndpointModel.endpoint =>
  toISODates(e) as EndpointModel.endpoint;

type EndpointRow = typeof endpoint.$inferSelect;

const buildUpdateSet = (
  params: UpdateEndpointParams,
  existing: EndpointRow
) => ({
  url: params.url ?? existing.url,
  description: params.description ?? existing.description,
  enabled: params.enabled ?? existing.enabled,
  version: params.version !== undefined ? params.version : existing.version,
  retryCount: params.retryCount ?? existing.retryCount,
  timeoutMs: params.timeoutMs ?? existing.timeoutMs,
  updatedAt: new Date(),
});

export abstract class EndpointService {
  static create(params: CreateEndpointParams): Promise<EndpointModel.endpoint> {
    return withServiceError(async () => {
      if (!isValidWebhookUrl(params.url)) {
        throw new BadRequestError(
          "Invalid webhook URL: must be http(s) and not target private networks"
        );
      }

      const now = new Date();

      const result = await db
        .insert(endpoint)
        .values({
          id: generateId(),
          organizationId: params.organizationId,
          url: params.url,
          description: params.description ?? null,
          secret: generateSecret(),
          enabled: params.enabled ?? true,
          version: params.version ?? null,
          retryCount: params.retryCount ?? 3,
          timeoutMs: params.timeoutMs ?? 30_000,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      if (!result[0]) {
        throw new Error("Failed to create endpoint");
      }
      if (params.enabled !== false) {
        await redis.del(`endpoints:${params.organizationId}`);
      }
      return toEndpoint(result[0]);
    }, "creating endpoint");
  }

  static getAll(
    organizationId: string,
    limit: number,
    offset: number
  ): Promise<EndpointModel.endpointList> {
    return withServiceError(async () => {
      const [endpoints, total] = await Promise.all([
        db
          .select()
          .from(endpoint)
          .where(eq(endpoint.organizationId, organizationId))
          .limit(limit)
          .offset(offset),
        db.$count(endpoint, eq(endpoint.organizationId, organizationId)),
      ]);
      return { endpoints: endpoints.map(toEndpoint), total };
    }, "fetching endpoints");
  }

  static getById(
    organizationId: string,
    endpointId: string
  ): Promise<EndpointModel.endpoint | null> {
    return withServiceError(async () => {
      const result = await db
        .select()
        .from(endpoint)
        .where(
          and(
            eq(endpoint.id, endpointId),
            eq(endpoint.organizationId, organizationId)
          )
        )
        .limit(1);

      return result[0] ? toEndpoint(result[0]) : null;
    }, "fetching endpoint");
  }

  static update(
    params: UpdateEndpointParams
  ): Promise<EndpointModel.endpoint | null> {
    return withServiceError(async () => {
      if (params.url && !isValidWebhookUrl(params.url)) {
        throw new BadRequestError(
          "Invalid webhook URL: must be http(s) and not target private networks"
        );
      }

      const existing = await db
        .select()
        .from(endpoint)
        .where(
          and(
            eq(endpoint.id, params.endpointId),
            eq(endpoint.organizationId, params.organizationId)
          )
        )
        .limit(1);

      if (!existing[0]) {
        return null;
      }

      const result = await db
        .update(endpoint)
        .set(buildUpdateSet(params, existing[0]))
        .where(eq(endpoint.id, params.endpointId))
        .returning();

      if (!result[0]) {
        throw new Error("Failed to update endpoint");
      }
      // Only invalidate if endpoint is/was enabled or enabled status is changing
      if (existing[0].enabled || params.enabled !== undefined) {
        await redis.del(`endpoints:${params.organizationId}`);
      }
      return toEndpoint(result[0]);
    }, "updating endpoint");
  }

  static delete(organizationId: string, endpointId: string): Promise<boolean> {
    return withServiceError(async () => {
      const result = await db
        .delete(endpoint)
        .where(
          and(
            eq(endpoint.id, endpointId),
            eq(endpoint.organizationId, organizationId)
          )
        )
        .returning({ id: endpoint.id });

      if (result.length > 0) {
        await redis.del(`endpoints:${organizationId}`);
      }
      return result.length > 0;
    }, "deleting endpoint");
  }

  static getEnabledEndpointsForDelivery(
    organizationId: string,
    filterIds?: string[]
  ): Promise<DeliveryEndpoint[]> {
    return withServiceError(async () => {
      // Only use cache when no filterIds (full list)
      if (!filterIds?.length) {
        const cached = await redis.get(`endpoints:${organizationId}`);
        if (cached) {
          return JSON.parse(cached) as DeliveryEndpoint[];
        }
      }

      const conditions = [
        eq(endpoint.organizationId, organizationId),
        eq(endpoint.enabled, true),
      ];
      if (filterIds?.length) {
        conditions.push(inArray(endpoint.id, filterIds));
      }

      const result = await db
        .select({
          id: endpoint.id,
          url: endpoint.url,
          secret: endpoint.secret,
          timeoutMs: endpoint.timeoutMs,
          retryCount: endpoint.retryCount,
          version: endpoint.version,
        })
        .from(endpoint)
        .where(and(...conditions));

      // Cache only full list results
      if (!filterIds?.length) {
        await redis.setex(
          `endpoints:${organizationId}`,
          CACHE_TTL,
          JSON.stringify(result)
        );
      }

      return result;
    }, "fetching enabled endpoints");
  }
}
