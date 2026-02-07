import { db } from "@usevon/db";
import { inboundDelivery, inboundEndpoint } from "@usevon/db/schema";
import { createConnection, type InboundForwardingJob } from "@usevon/queue";
import { processDelivery, type DeliveryConfig } from "@/lib/process-delivery";
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

const BLOCKED_HEADERS = [
  "x-von-signature",
  "x-von-timestamp",
  "x-von-inbound-delivery-id",
  "authorization",
  "host",
];

const inboundConfig: DeliveryConfig = {
  label: "Inbound",
  deliveryTable: inboundDelivery,
  endpointTable: inboundEndpoint,
  getDeliveryStmt: getInboundDeliveryStmt,
  getEndpointStmt: getInboundEndpointStateStmt,
  completedStatus: "forwarded",

  buildStatusSet: (status) => ({
    status,
  }),

  buildSuccessSet: ({ attempts, now, responseStatus }) => ({
    status: "forwarded",
    attempts,
    lastAttemptAt: now,
    forwardedAt: now,
    responseStatus,
  }),

  buildFailureSet: ({ attempts, now, isFinalAttempt }) => ({
    status: isFinalAttempt ? "failed" : "pending",
    attempts,
    lastAttemptAt: now,
  }),

  buildRequest: ({ payload, timestamp, signature, deliveryId, job }) => {
    const originalHeaders: Record<string, string> = job.headers
      ? JSON.parse(job.headers)
      : {};

    const safeHeaders: Record<string, string> = {};
    for (const [key, value] of Object.entries(originalHeaders)) {
      if (!BLOCKED_HEADERS.includes(key.toLowerCase())) {
        safeHeaders[key] = value;
      }
    }

    return {
      url: job.endpoint.forwardUrl,
      headers: {
        ...safeHeaders,
        "X-Von-Signature": `t=${timestamp},v1=${signature}`,
        "X-Von-Timestamp": String(timestamp),
        "X-Von-Inbound-Delivery-Id": deliveryId,
      },
      body: payload,
    };
  },
};

const processInboundForwarding = async (job: Job<InboundForwardingJob>) => {
  await processDelivery(inboundConfig, job);
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
