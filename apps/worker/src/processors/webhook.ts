import { db } from "@usevon/db";
import {
  delivery,
  deliveryAttempt,
  endpoint,
  webhookVersion,
} from "@usevon/db/schema";
import {
  cacheGet,
  cacheSet,
  type DeliveryEndpoint,
  type WebhookDeliveryJob,
} from "@usevon/queue";
import {
  applyTransforms,
  buildSignatureHeader,
  MemoCache,
  type Transforms,
  withDecryptedSecretFields,
} from "@usevon/utils";
import type { Job } from "bullmq";
import { and, eq, sql } from "drizzle-orm";
import { createWorker } from "@/lib/create-worker";
import { log } from "@/lib/logger";
import { type DeliveryConfig, processDelivery } from "@/lib/process-delivery";

type HydratedWebhookJob = WebhookDeliveryJob & { endpoint: DeliveryEndpoint };

const getDeliveryStmt = db
  .select()
  .from(delivery)
  .where(eq(delivery.id, sql.placeholder("id")))
  .limit(1)
  .prepare("worker_get_delivery");

const getEndpointStateStmt = db
  .select({
    status: endpoint.status,
    circuitState: endpoint.circuitState,
    circuitOpenedAt: endpoint.circuitOpenedAt,
    failureCount: endpoint.failureCount,
  })
  .from(endpoint)
  .where(eq(endpoint.id, sql.placeholder("id")))
  .limit(1)
  .prepare("worker_get_endpoint_state");

const getDeliveryEndpointStmt = db
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
  .where(eq(endpoint.id, sql.placeholder("id")))
  .limit(1)
  .prepare("worker_get_delivery_endpoint");

const endpointCache = new MemoCache<DeliveryEndpoint>(10_000);

const loadDeliveryEndpoint = async (
  id: string
): Promise<DeliveryEndpoint | null> => {
  const cached = endpointCache.get(id);
  if (cached) {
    return cached;
  }
  const [row] = await getDeliveryEndpointStmt.execute({ id });
  if (!row) {
    return null;
  }
  const decrypted = withDecryptedSecretFields(row);
  endpointCache.set(id, decrypted);
  return decrypted;
};

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

const VERSION_CACHE_TTL = 60;

const getVersionTransforms = async (
  version: string,
  organizationId: string
): Promise<Transforms | null> => {
  const key = `version:${organizationId}:${version}`;
  const cached = await cacheGet<Transforms>(key);
  if (cached) { return cached; }

  const [result] = await getVersionStmt.execute({
    version,
    orgId: organizationId,
  });
  const transforms = (result?.transforms as Transforms) ?? null;

  if (transforms) {
    await cacheSet(key, transforms, VERSION_CACHE_TTL);
  }

  return transforms;
};

const webhookConfig: DeliveryConfig<HydratedWebhookJob> = {
  label: "Webhook",
  deliveryTable: delivery,
  endpointTable: endpoint,
  getDeliveryStmt,
  getEndpointStmt: getEndpointStateStmt,
  completedStatus: "delivered",

  buildStatusSet: (status) => ({
    status,
  }),

  buildSuccessSet: ({ attempts, now, responseStatus, durationMs }) => ({
    status: "delivered",
    attempts,
    lastAttemptAt: now,
    response: { status: responseStatus, durationMs },
  }),

  buildFailureSet: ({ attempts, now, isFinalAttempt, durationMs, error }) => ({
    status: isFinalAttempt ? "failed" : "pending",
    attempts,
    lastAttemptAt: now,
    ...(isFinalAttempt ? { response: { error, durationMs } } : {}),
  }),

  recordAttempt: async ({
    tx,
    job,
    deliveryId,
    attempts,
    now,
    startedAt,
    durationMs,
    isFinalAttempt,
    responseStatus,
    error,
  }) => {
    await tx.insert(deliveryAttempt).values({
      id: crypto.randomUUID(),
      organizationId: job.organizationId,
      deliveryId,
      eventId: job.eventId,
      endpointId: job.endpoint.id,
      attemptNumber: attempts,
      outcome: error ? "failure" : "success",
      isFinal: isFinalAttempt,
      httpStatus: responseStatus,
      error: error ?? null,
      durationMs,
      startedAt,
      finishedAt: now,
      createdAt: now,
    });
  },

  buildRequest: ({
    payload,
    timestamp,
    signature: signedPayload,
    deliveryId,
    job,
  }) => ({
    url: job.endpoint.url,
    headers: {
      "Content-Type": "application/json",
      "X-Von-Signature": buildSignatureHeader(
        timestamp,
        signedPayload,
        job.endpoint.secret,
        job.endpoint.previousSecret
      ),
      "X-Von-Timestamp": String(timestamp),
      "X-Von-Event-Type": job.eventType,
      "X-Von-Delivery-Id": deliveryId,
      "X-Von-Event-Id": job.eventId,
    },
    body: payload,
  }),

  transformPayload: async (payload, job) => {
    if (!job.endpoint.version) {
      return payload;
    }

    const transforms = await getVersionTransforms(
      job.endpoint.version,
      job.organizationId
    );

    if (!transforms) {
      return payload;
    }

    const eventTransforms = transforms[job.eventType];
    if (!eventTransforms) {
      return payload;
    }

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
        .set({ status: "failed" })
        .where(eq(delivery.id, job.deliveryId));
      return null;
    }

    const transformed = applyTransforms(parsed, eventTransforms);
    log.debug(
      {
        endpointId: job.endpoint.id,
        version: job.endpoint.version,
        eventType: job.eventType,
      },
      "Applied transforms"
    );
    return JSON.stringify(transformed);
  },
};

export const createWebhookWorker = () =>
  createWorker<WebhookDeliveryJob>("webhook-delivery", async (job) => {
    const deliveryEndpoint = await loadDeliveryEndpoint(job.data.endpointId);
    if (!deliveryEndpoint) {
      log.error(
        { deliveryId: job.data.deliveryId, endpointId: job.data.endpointId },
        "Webhook endpoint not found for delivery"
      );
      await db
        .update(delivery)
        .set({ status: "failed" })
        .where(eq(delivery.id, job.data.deliveryId));
      return;
    }
    const hydrated = job as Job<HydratedWebhookJob>;
    hydrated.data = { ...job.data, endpoint: deliveryEndpoint };
    await processDelivery(webhookConfig, hydrated);
  });
