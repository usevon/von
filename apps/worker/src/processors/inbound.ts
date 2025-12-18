import { db } from "@usevon/db";
import { inboundDelivery, inboundEndpoint } from "@usevon/db/schema";
import { createConnection, type InboundForwardingJob } from "@usevon/queue";
import {
  CIRCUIT_CONFIG,
  type CircuitState,
  getSuccessUpdate,
  hmacSign,
  isCircuitOpen,
  shouldTransitionToHalfOpen,
} from "@usevon/utils";
import { createLogger } from "@usevon/utils/logger";
import { type Job, Worker } from "bullmq";
import { eq, sql } from "drizzle-orm";
import { env } from "@/env";

const log = createLogger({
  level: env.NODE_ENV === "development" ? "debug" : "info",
  pretty: env.NODE_ENV === "development",
});

const getInboundDeliveryStmt = db
  .select()
  .from(inboundDelivery)
  .where(eq(inboundDelivery.id, sql.placeholder("id")))
  .limit(1)
  .prepare("worker_get_inbound_delivery");

const getInboundEndpointStateStmt = db
  .select({
    enabled: inboundEndpoint.enabled,
    circuitState: inboundEndpoint.circuitState,
    circuitOpenedAt: inboundEndpoint.circuitOpenedAt,
    failureCount: inboundEndpoint.failureCount,
  })
  .from(inboundEndpoint)
  .where(eq(inboundEndpoint.id, sql.placeholder("id")))
  .limit(1)
  .prepare("worker_get_inbound_endpoint_state");

const processInboundForwarding = async (job: Job<InboundForwardingJob>) => {
  const { deliveryId, endpoint: ep, payload, headers } = job.data;

  const [[deliveryRecord], [endpointState]] = await Promise.all([
    getInboundDeliveryStmt.execute({ id: deliveryId }),
    getInboundEndpointStateStmt.execute({ id: ep.id }),
  ]);

  if (!deliveryRecord) {
    log.warn({ deliveryId }, "Inbound delivery not found, skipping");
    return;
  }

  if (deliveryRecord.status === "forwarded") {
    log.info({ deliveryId }, "Already forwarded, skipping");
    return;
  }

  if (!endpointState) {
    log.error({ endpointId: ep.id }, "Inbound endpoint not found");
    throw new Error(`Inbound endpoint ${ep.id} not found`);
  }

  if (!endpointState.enabled) {
    log.info(
      { endpointId: ep.id },
      "Inbound endpoint disabled, marking as skipped"
    );
    await db
      .update(inboundDelivery)
      .set({ status: "skipped" })
      .where(eq(inboundDelivery.id, deliveryId));
    return;
  }

  const circuitState = {
    circuitState: endpointState.circuitState as CircuitState,
    circuitOpenedAt: endpointState.circuitOpenedAt,
    failureCount: endpointState.failureCount,
  };

  if (isCircuitOpen(circuitState)) {
    log.info({ endpointId: ep.id }, "Circuit breaker open, marking as skipped");
    await db
      .update(inboundDelivery)
      .set({ status: "circuit_open" })
      .where(eq(inboundDelivery.id, deliveryId));
    return;
  }

  if (shouldTransitionToHalfOpen(circuitState)) {
    await db
      .update(inboundEndpoint)
      .set({ circuitState: "half_open", updatedAt: new Date() })
      .where(eq(inboundEndpoint.id, ep.id));
  }

  const originalHeaders: Record<string, string> = headers
    ? JSON.parse(headers)
    : {};
  const now = new Date();
  const timestamp = Math.floor(now.getTime() / 1000);
  const signedPayload = `${timestamp}.${payload}`;
  const signature = hmacSign(signedPayload, ep.secret);

  // Filter out headers that could override security-sensitive values
  const BLOCKED_HEADERS = [
    "x-von-signature",
    "x-von-timestamp",
    "x-von-inbound-delivery-id",
    "authorization",
    "host",
  ];
  const safeHeaders: Record<string, string> = {};
  for (const [key, value] of Object.entries(originalHeaders)) {
    if (!BLOCKED_HEADERS.includes(key.toLowerCase())) {
      safeHeaders[key] = value;
    }
  }

  try {
    const response = await fetch(ep.forwardUrl, {
      method: "POST",
      headers: {
        ...safeHeaders,
        "X-Von-Signature": `t=${timestamp},v1=${signature}`,
        "X-Von-Timestamp": String(timestamp),
        "X-Von-Inbound-Delivery-Id": deliveryId,
      },
      body: payload,
      signal: AbortSignal.timeout(ep.timeoutMs),
    });

    if (response.ok) {
      const successUpdate = getSuccessUpdate();

      await Promise.all([
        db
          .update(inboundDelivery)
          .set({
            status: "forwarded",
            attempts: deliveryRecord.attempts + 1,
            lastAttemptAt: now,
            forwardedAt: now,
            responseStatus: response.status,
          })
          .where(eq(inboundDelivery.id, deliveryId)),
        db
          .update(inboundEndpoint)
          .set({
            ...successUpdate,
            updatedAt: now,
          })
          .where(eq(inboundEndpoint.id, ep.id)),
      ]);

      log.info(
        { deliveryId, status: response.status },
        "Inbound webhook forwarded successfully"
      );
    } else {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (error) {
    const attempts = deliveryRecord.attempts + 1;
    const maxAttempts = ep.retryCount;
    const isFinalAttempt = attempts >= maxAttempts;

    // Atomic circuit breaker update - increment failureCount and conditionally open circuit
    const threshold = CIRCUIT_CONFIG.failureThreshold;
    const [, [endpointResult]] = await Promise.all([
      db
        .update(inboundDelivery)
        .set({
          status: isFinalAttempt ? "failed" : "pending",
          attempts,
          lastAttemptAt: now,
        })
        .where(eq(inboundDelivery.id, deliveryId)),
      db
        .update(inboundEndpoint)
        .set({
          failureCount: sql`${inboundEndpoint.failureCount} + 1`,
          circuitState: sql`CASE WHEN ${inboundEndpoint.failureCount} + 1 >= ${threshold} THEN 'open' ELSE ${inboundEndpoint.circuitState} END`,
          circuitOpenedAt: sql`CASE WHEN ${inboundEndpoint.failureCount} + 1 >= ${threshold} AND ${inboundEndpoint.circuitState} != 'open' THEN ${now} ELSE ${inboundEndpoint.circuitOpenedAt} END`,
          lastFailureAt: now,
          updatedAt: now,
        })
        .where(eq(inboundEndpoint.id, ep.id))
        .returning({
          failureCount: inboundEndpoint.failureCount,
          circuitState: inboundEndpoint.circuitState,
        }),
    ]);

    if (
      endpointResult?.circuitState === "open" &&
      endpointResult.failureCount === threshold
    ) {
      log.warn(
        { endpointId: ep.id, failureCount: endpointResult.failureCount },
        "Circuit breaker opened"
      );
    }

    log.error(
      { deliveryId, attempts, maxAttempts, error: String(error).slice(0, 200) },
      "Inbound forwarding failed"
    );

    if (!isFinalAttempt) {
      throw error;
    }
  }
};

export const createInboundWorker = () => {
  const worker = new Worker<InboundForwardingJob>(
    "inbound-forwarding",
    processInboundForwarding,
    {
      connection: createConnection(),
      concurrency: env.WORKER_CONCURRENCY,
    }
  );

  worker.on("completed", (job) => {
    log.debug({ jobId: job.id }, "Inbound job completed");
  });

  worker.on("failed", (job, error) => {
    log.error({ jobId: job?.id, error: error.message }, "Inbound job failed");
  });

  return worker;
};
