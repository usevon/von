import { db } from "@usevon/db";
import { delivery, endpoint, event } from "@usevon/db/schema";
import {
  type DeliveryEndpoint,
  getRedisClient,
  type WebhookDeliveryJob,
} from "@usevon/queue";
import type {
  CreateEndpoint,
  EndpointStatus,
  UpdateEndpoint,
} from "@usevon/types";
import {
  DEFAULT_MAX_ATTEMPTS,
  DEFAULT_TIMEOUT_MS,
  generateSecret,
  InternalServerError,
  NotFoundError,
} from "@usevon/utils";
import { and, desc, eq, inArray } from "drizzle-orm";
import { withReservedMonthlyQuota } from "@/lib/delivery-quota";
import { type CursorPageInput, runCursorListQuery } from "@/lib/pagination";
import {
  decryptSecret,
  encryptSecret,
  withDecryptedSecretFields,
} from "@/lib/secret-cipher";
import { assertSafeWebhookUrl } from "@/lib/url-safety";
import { enqueueWebhookDispatchJobs } from "@/lib/webhook-dispatch";
import type { EndpointModel } from "@/modules/endpoints/model";

const redis = getRedisClient();
const CACHE_TTL = 300;
const ENDPOINT_CURSOR_SORT = "desc" as const;

type CreateEndpointParams = CreateEndpoint & { organizationId: string };
type UpdateEndpointParams = UpdateEndpoint & {
  organizationId: string;
  endpointId: string;
};

type TestEndpointParams = {
  organizationId: string;
  endpointId: string;
  plan: string;
  payload?: unknown;
  eventType?: string;
};

type EndpointRow = typeof endpoint.$inferSelect;

const toResponse = (row: EndpointRow): EndpointModel.endpoint => ({
  id: row.id,
  url: row.url,
  description: row.description,
  status: row.status as EndpointStatus,
  version: row.version,
  maxAttempts: row.maxAttempts,
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
  maxAttempts: params.maxAttempts ?? existing.maxAttempts,
  timeoutMs: params.timeoutMs ?? existing.timeoutMs,
  events: params.events !== undefined ? params.events : existing.events,
  updatedAt: new Date(),
});

export abstract class EndpointService {
  static async create(
    params: CreateEndpointParams
  ): Promise<EndpointModel.endpointWithSecret> {
    await assertSafeWebhookUrl(
      params.url,
      "Invalid webhook URL: must be http(s) and not target private networks"
    );

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
        maxAttempts: params.maxAttempts ?? DEFAULT_MAX_ATTEMPTS,
        timeoutMs: params.timeoutMs ?? DEFAULT_TIMEOUT_MS,
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
    pagination: CursorPageInput
  ): Promise<EndpointModel.endpointList> {
    const { items, nextCursor } = await runCursorListQuery({
      pagination,
      sort: ENDPOINT_CURSOR_SORT,
      scope: {
        resource: "endpoints",
        organizationId,
      },
      createdAtColumn: endpoint.createdAt,
      idColumn: endpoint.id,
      baseCondition: eq(endpoint.organizationId, organizationId),
      fetchRows: (where, limit) =>
        db
          .select()
          .from(endpoint)
          .where(where)
          .orderBy(desc(endpoint.createdAt), desc(endpoint.id))
          .limit(limit),
      toCursorPosition: (row) => ({
        createdAt: row.createdAt,
        id: row.id,
      }),
    });

    return {
      endpoints: items.map((e) => toResponse(e)),
      nextCursor,
    };
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
    if (params.url) {
      await assertSafeWebhookUrl(
        params.url,
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
      const cacheKey = `endpoints:${organizationId}`;
      const cached = await redis.get(cacheKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached) as DeliveryEndpoint[];
          return parsed.map((row) => withDecryptedSecretFields(row));
        } catch {
          await redis.del(cacheKey);
        }
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
        maxAttempts: endpoint.maxAttempts,
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

    return result.map((row) => withDecryptedSecretFields(row));
  }

  static async testEndpoint(
    params: TestEndpointParams
  ): Promise<EndpointModel.testResponse> {
    const [endpointRow] = await db
      .select({
        id: endpoint.id,
        url: endpoint.url,
        secret: endpoint.secret,
        previousSecret: endpoint.previousSecret,
        timeoutMs: endpoint.timeoutMs,
        maxAttempts: endpoint.maxAttempts,
        version: endpoint.version,
        events: endpoint.events,
      })
      .from(endpoint)
      .where(
        and(
          eq(endpoint.id, params.endpointId),
          eq(endpoint.organizationId, params.organizationId)
        )
      )
      .limit(1);

    if (!endpointRow) {
      throw new NotFoundError();
    }

    const now = new Date();
    const type = params.eventType ?? "von.test";
    const testPayload = params.payload ?? {
      test: true,
      timestamp: now.toISOString(),
    };
    const payloadStr = JSON.stringify(testPayload);

    return withReservedMonthlyQuota(
      params.organizationId,
      params.plan,
      1,
      async () => {
        const eventId = crypto.randomUUID();
        const deliveryId = crypto.randomUUID();

        await db.insert(event).values({
          id: eventId,
          organizationId: params.organizationId,
          eventType: type,
          payload: payloadStr,
          createdAt: now,
        });

        await db.insert(delivery).values({
          id: deliveryId,
          eventId,
          endpointId: params.endpointId,
          status: "pending",
          attempts: 0,
          createdAt: now,
        });

        const deliveryEndpoint = withDecryptedSecretFields(endpointRow);

        await enqueueWebhookDispatchJobs([
          {
            name: "webhook-delivery",
            data: {
              deliveryId,
              eventId,
              payload: payloadStr,
              eventType: type,
              endpoint: deliveryEndpoint,
              organizationId: params.organizationId,
            } satisfies WebhookDeliveryJob,
          },
        ]);

        return { eventId, deliveryId };
      }
    );
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
