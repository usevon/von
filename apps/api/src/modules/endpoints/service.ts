import { db } from "@usevon/db";
import { delivery, endpoint, event } from "@usevon/db/schema";
import {
  type DeliveryEndpoint,
  getRedisClient,
  getWebhookDeliveryQueue,
  type WebhookDeliveryJob,
} from "@usevon/queue";
import type {
  CreateEndpoint,
  EndpointStatus,
  UpdateEndpoint,
} from "@usevon/types";
import {
  BadRequestError,
  generateSecret,
  InternalServerError,
  isSafeWebhookUrl,
  NotFoundError,
} from "@usevon/utils";
import { and, eq, inArray } from "drizzle-orm";
import { releaseMonthlyQuota, reserveMonthlyQuota } from "@/lib/delivery-quota";
import {
  decryptOptionalSecret,
  decryptSecret,
  encryptSecret,
} from "@/lib/secret-cipher";
import type { EndpointModel } from "@/modules/endpoints/model";

const redis = getRedisClient();
const CACHE_TTL = 300;

type CreateEndpointParams = CreateEndpoint & { organizationId: string };
type UpdateEndpointParams = UpdateEndpoint & {
  organizationId: string;
  endpointId: string;
};

type EndpointRow = typeof endpoint.$inferSelect;

const withDecryptedEndpointSecrets = <T extends { secret: string }>(
  row: T & { previousSecret?: string | null }
): T & { previousSecret?: string | null } => ({
  ...row,
  secret: decryptSecret(row.secret),
  previousSecret: decryptOptionalSecret(row.previousSecret),
});

const toResponse = (row: EndpointRow): EndpointModel.endpoint => ({
  id: row.id,
  url: row.url,
  description: row.description,
  status: row.status as EndpointStatus,
  version: row.version,
  retryCount: row.retryCount,
  timeoutMs: row.timeoutMs,
  events: row.events,
  lastSuccessAt: row.lastSuccessAt?.toISOString() ?? null,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

const toResponseWithSecret = (
  row: EndpointRow
): EndpointModel.endpointWithSecret => ({
  ...toResponse(row),
  secret: decryptSecret(row.secret),
});

const buildUpdateSet = (
  params: UpdateEndpointParams,
  existing: EndpointRow
) => ({
  url: params.url ?? existing.url,
  description: params.description ?? existing.description,
  status: params.status ?? existing.status,
  version: params.version !== undefined ? params.version : existing.version,
  retryCount: params.retryCount ?? existing.retryCount,
  timeoutMs: params.timeoutMs ?? existing.timeoutMs,
  events: params.events !== undefined ? params.events : existing.events,
  updatedAt: new Date(),
});

export abstract class EndpointService {
  static async create(
    params: CreateEndpointParams
  ): Promise<EndpointModel.endpointWithSecret> {
    if (!(await isSafeWebhookUrl(params.url))) {
      throw new BadRequestError(
        "Invalid webhook URL: must be http(s) and not target private networks"
      );
    }

    const now = new Date();

    const result = await db
      .insert(endpoint)
      .values({
        id: crypto.randomUUID(),
        organizationId: params.organizationId,
        url: params.url,
        description: params.description ?? null,
        secret: encryptSecret(generateSecret()),
        status: params.status ?? "active",
        version: params.version ?? null,
        retryCount: params.retryCount ?? 3,
        timeoutMs: params.timeoutMs ?? 30_000,
        events: params.events ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    if (!result[0]) {
      throw new InternalServerError();
    }
    if (params.status !== "disabled") {
      await redis.del(`endpoints:${params.organizationId}`);
    }
    return toResponseWithSecret(result[0]);
  }

  static async getAll(
    organizationId: string,
    limit: number,
    offset: number
  ): Promise<EndpointModel.endpointList> {
    const [endpoints, total] = await Promise.all([
      db
        .select()
        .from(endpoint)
        .where(eq(endpoint.organizationId, organizationId))
        .limit(limit)
        .offset(offset),
      db.$count(endpoint, eq(endpoint.organizationId, organizationId)),
    ]);
    return { endpoints: endpoints.map((e) => toResponse(e)), total };
  }

  static async getById(
    organizationId: string,
    endpointId: string
  ): Promise<EndpointModel.endpoint | null> {
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

    return result[0] ? toResponse(result[0]) : null;
  }

  static async update(
    params: UpdateEndpointParams
  ): Promise<EndpointModel.endpoint | null> {
    if (params.url && !(await isSafeWebhookUrl(params.url))) {
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
      throw new InternalServerError();
    }
    if (existing[0].status === "active" || params.status !== undefined) {
      await redis.del(`endpoints:${params.organizationId}`);
    }
    return toResponse(result[0]);
  }

  static async delete(
    organizationId: string,
    endpointId: string
  ): Promise<boolean> {
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
  }

  static async getEnabledEndpointsForDelivery(
    organizationId: string,
    filterIds?: string[]
  ): Promise<DeliveryEndpoint[]> {
    if (!filterIds?.length) {
      const cached = await redis.get(`endpoints:${organizationId}`);
      if (cached) {
        const parsed = JSON.parse(cached) as DeliveryEndpoint[];
        return parsed.map((row) => withDecryptedEndpointSecrets(row));
      }
    }

    const conditions = [
      eq(endpoint.organizationId, organizationId),
      eq(endpoint.status, "active"),
    ];
    if (filterIds?.length) {
      conditions.push(inArray(endpoint.id, filterIds));
    }

    const result = await db
      .select({
        id: endpoint.id,
        url: endpoint.url,
        secret: endpoint.secret,
        previousSecret: endpoint.previousSecret,
        timeoutMs: endpoint.timeoutMs,
        retryCount: endpoint.retryCount,
        version: endpoint.version,
        events: endpoint.events,
      })
      .from(endpoint)
      .where(and(...conditions));

    if (!filterIds?.length) {
      await redis.setex(
        `endpoints:${organizationId}`,
        CACHE_TTL,
        JSON.stringify(result)
      );
    }

    return result.map((row) => withDecryptedEndpointSecrets(row));
  }

  static async testEndpoint(
    organizationId: string,
    endpointId: string,
    plan: string,
    payload?: unknown,
    eventType?: string
  ): Promise<EndpointModel.testResponse> {
    const ep = await db
      .select({
        id: endpoint.id,
        url: endpoint.url,
        secret: endpoint.secret,
        previousSecret: endpoint.previousSecret,
        timeoutMs: endpoint.timeoutMs,
        retryCount: endpoint.retryCount,
        version: endpoint.version,
        events: endpoint.events,
      })
      .from(endpoint)
      .where(
        and(
          eq(endpoint.id, endpointId),
          eq(endpoint.organizationId, organizationId)
        )
      )
      .limit(1);

    if (!ep[0]) {
      throw new NotFoundError();
    }

    const now = new Date();
    const type = eventType ?? "von.test";
    const testPayload = payload ?? {
      test: true,
      timestamp: now.toISOString(),
    };
    const payloadStr = JSON.stringify(testPayload);

    await reserveMonthlyQuota(organizationId, plan, 1);
    let releaseQuota = true;

    try {
      const eventId = crypto.randomUUID();
      const deliveryId = crypto.randomUUID();

      await db.insert(event).values({
        id: eventId,
        organizationId,
        eventType: type,
        payload: payloadStr,
        createdAt: now,
      });

      await db.insert(delivery).values({
        id: deliveryId,
        eventId,
        endpointId,
        status: "pending",
        attempts: 0,
        createdAt: now,
      });

      const deliveryEndpoint = withDecryptedEndpointSecrets(ep[0]);

      try {
        await getWebhookDeliveryQueue().add("webhook-delivery", {
          deliveryId,
          eventId,
          payload: payloadStr,
          eventType: type,
          endpoint: deliveryEndpoint,
          organizationId,
        } satisfies WebhookDeliveryJob);
      } catch {
        await db
          .update(delivery)
          .set({ status: "failed" })
          .where(eq(delivery.id, deliveryId));
        throw new InternalServerError();
      }

      releaseQuota = false;
      return { eventId, deliveryId };
    } finally {
      if (releaseQuota) {
        await releaseMonthlyQuota(organizationId, 1);
      }
    }
  }

  static async rotateSecret(
    organizationId: string,
    endpointId: string
  ): Promise<EndpointModel.rotateResponse> {
    const existing = await db
      .select()
      .from(endpoint)
      .where(
        and(
          eq(endpoint.id, endpointId),
          eq(endpoint.organizationId, organizationId)
        )
      )
      .limit(1);

    if (!existing[0]) {
      throw new NotFoundError();
    }

    const newSecret = generateSecret();
    const previousSecret = decryptSecret(existing[0].secret);

    await db
      .update(endpoint)
      .set({
        secret: encryptSecret(newSecret),
        previousSecret: encryptSecret(previousSecret),
        updatedAt: new Date(),
      })
      .where(eq(endpoint.id, endpointId));

    await redis.del(`endpoints:${organizationId}`);

    return { secret: newSecret, previousSecret };
  }

  static async clearPreviousSecret(
    organizationId: string,
    endpointId: string
  ): Promise<boolean> {
    const result = await db
      .update(endpoint)
      .set({
        previousSecret: null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(endpoint.id, endpointId),
          eq(endpoint.organizationId, organizationId)
        )
      )
      .returning({ id: endpoint.id });

    if (result.length === 0) {
      throw new NotFoundError();
    }

    await redis.del(`endpoints:${organizationId}`);
    return true;
  }
}
