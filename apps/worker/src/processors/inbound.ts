import { db } from "@usevon/db";
import { inboundDelivery, inboundEndpoint } from "@usevon/db/schema";
import type { InboundForwardingJob } from "@usevon/queue";
import { buildSignatureHeader } from "@usevon/utils";
import { eq, sql } from "drizzle-orm";
import { createWorker } from "@/lib/create-worker";
import { type DeliveryConfig, processDelivery } from "@/lib/process-delivery";

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

  buildSuccessSet: ({ attempts, now, responseStatus, durationMs }) => ({
    status: "forwarded",
    attempts,
    lastAttemptAt: now,
    forwardedAt: now,
    response: { status: responseStatus, durationMs },
  }),

  buildFailureSet: ({ attempts, now, isFinalAttempt, durationMs, error }) => ({
    status: isFinalAttempt ? "failed" : "pending",
    attempts,
    lastAttemptAt: now,
    ...(isFinalAttempt ? { response: { error, durationMs } } : {}),
  }),

  buildRequest: ({
    payload,
    timestamp,
    signature: signedPayload,
    deliveryId,
    job,
  }) => {
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
        "X-Von-Signature": buildSignatureHeader(
          timestamp,
          signedPayload,
          job.endpoint.secret,
          job.endpoint.previousSecret
        ),
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
