import { db } from "@usevon/db";
import { inboundDelivery, inboundEndpoint } from "@usevon/db/schema";
import type { InboundForwardingJob } from "@usevon/queue";
import { createWorker } from "@/lib/create-worker";
import { processDelivery, type DeliveryConfig } from "@/lib/process-delivery";
import { eq, sql } from "drizzle-orm";

const getInboundDeliveryStmt = db
  .select()
  .from(inboundDelivery)
  .where(eq(inboundDelivery.id, sql.placeholder("id")))
  .limit(1)
  .prepare("worker_get_inbound_delivery");

const getInboundEndpointStateStmt = db
  .select({
    status: inboundEndpoint.status,
    circuitState: inboundEndpoint.circuitState,
    circuitOpenedAt: inboundEndpoint.circuitOpenedAt,
    failureCount: inboundEndpoint.failureCount,
  })
  .from(inboundEndpoint)
  .where(eq(inboundEndpoint.id, sql.placeholder("id")))
  .limit(1)
  .prepare("worker_get_inbound_endpoint_state");

const BLOCKED_HEADERS = new Set([
  "x-von-signature",
  "x-von-timestamp",
  "x-von-inbound-delivery-id",
  "authorization",
  "host",
]);

const inboundConfig: DeliveryConfig<InboundForwardingJob> = {
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
      if (!BLOCKED_HEADERS.has(key.toLowerCase())) {
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

export const createInboundWorker = () =>
  createWorker<InboundForwardingJob>("inbound-forwarding", (job) =>
    processDelivery(inboundConfig, job)
  );
