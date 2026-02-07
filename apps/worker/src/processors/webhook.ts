import { db } from "@usevon/db";
import { delivery, endpoint, webhookVersion } from "@usevon/db/schema";
import { getRedisClient, type WebhookDeliveryJob } from "@usevon/queue";
import { applyTransforms, type Transforms } from "@usevon/utils";
import { createWorker } from "@/lib/create-worker";
import { log } from "@/lib/logger";
import { processDelivery, type DeliveryConfig } from "@/lib/process-delivery";
import { and, eq, sql } from "drizzle-orm";

const getDeliveryStmt = db
  .select()
  .from(delivery)
  .where(eq(delivery.id, sql.placeholder("id")))
  .limit(1)
  .prepare("worker_get_delivery");

const getEndpointStateStmt = db
  .select({
    enabled: endpoint.enabled,
    circuitState: endpoint.circuitState,
    circuitOpenedAt: endpoint.circuitOpenedAt,
    failureCount: endpoint.failureCount,
  })
  .from(endpoint)
  .where(eq(endpoint.id, sql.placeholder("id")))
  .limit(1)
  .prepare("worker_get_endpoint_state");

const getVersionStmt = db
  .select({ transforms: webhookVersion.transforms })
  .from(webhookVersion)
  .where(
    and(
      eq(webhookVersion.version, sql.placeholder("version")),
      eq(webhookVersion.organizationId, sql.placeholder("orgId"))
    )
  )
  .limit(1)
  .prepare("worker_get_version");

const redis = getRedisClient();
const VERSION_CACHE_TTL = 60; // seconds

const getVersionTransforms = async (
  version: string,
  organizationId: string
): Promise<Transforms | null> => {
  const cacheKey = `version:${organizationId}:${version}`;
  const cached = await redis.get(cacheKey);

  if (cached) {
    return JSON.parse(cached) as Transforms;
  }

  const [result] = await getVersionStmt.execute({
    version,
    orgId: organizationId,
  });
  const transforms = (result?.transforms as Transforms) ?? null;

  if (transforms) {
    await redis.setex(cacheKey, VERSION_CACHE_TTL, JSON.stringify(transforms));
  }

  return transforms;
};

const webhookConfig: DeliveryConfig<WebhookDeliveryJob> = {
  label: "Webhook",
  deliveryTable: delivery,
  endpointTable: endpoint,
  getDeliveryStmt,
  getEndpointStmt: getEndpointStateStmt,
  completedStatus: "delivered",

  buildStatusSet: (status) => ({
    status,
    updatedAt: new Date(),
  }),

  buildSuccessSet: ({ attempts, now, responseStatus }) => ({
    status: "delivered",
    attempts,
    lastAttemptAt: now,
    responseStatus,
    updatedAt: now,
  }),

  buildFailureSet: ({ attempts, now, isFinalAttempt }) => ({
    status: isFinalAttempt ? "failed" : "pending",
    attempts,
    lastAttemptAt: now,
    updatedAt: now,
  }),

  buildRequest: ({ payload, timestamp, signature, deliveryId, job }) => ({
    url: job.endpoint.url,
    headers: {
      "Content-Type": "application/json",
      "X-Von-Signature": `t=${timestamp},v1=${signature}`,
      "X-Von-Timestamp": String(timestamp),
      "X-Von-Event-Type": job.eventType,
      "X-Von-Delivery-Id": deliveryId,
      "X-Von-Event-Id": job.eventId,
    },
    body: payload,
  }),

  transformPayload: async (payload, job) => {
    if (!job.endpoint.version) return payload;

    const transforms = await getVersionTransforms(
      job.endpoint.version,
      job.organizationId
    );

    if (!transforms) return payload;

    const eventTransforms = transforms[job.eventType];
    if (!eventTransforms) return payload;

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(payload) as Record<string, unknown>;
    } catch {
      log.error(
        { deliveryId: job.deliveryId, payload: payload.slice(0, 100) },
        "Invalid JSON payload"
      );
      await db
        .update(delivery)
        .set({ status: "failed", updatedAt: new Date() })
        .where(eq(delivery.id, job.deliveryId));
      return null;
    }

    const transformed = applyTransforms(parsed, eventTransforms);
    log.debug(
      { endpointId: job.endpoint.id, version: job.endpoint.version, eventType: job.eventType },
      "Applied transforms"
    );
    return JSON.stringify(transformed);
  },
};

export const createWebhookWorker = () =>
  createWorker<WebhookDeliveryJob>("webhook-delivery", (job) =>
    processDelivery(webhookConfig, job)
  );
