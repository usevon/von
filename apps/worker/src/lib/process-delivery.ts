import { db } from "@usevon/db";
import * as schema from "@usevon/db/schema";
import {
  EndpointRecoveredEmail,
  FailureAlertEmail,
  render,
} from "@usevon/email";
import { setnx } from "@usevon/queue";
import {
  CIRCUIT_CONFIG,
  type CircuitState,
  isCircuitOpen,
  isSafeWebhookUrl,
  shouldTransitionToHalfOpen,
} from "@usevon/utils";
import type { Job } from "bullmq";
import { eq } from "drizzle-orm";
import { env } from "@/env";
import { circuitFailureSet, circuitSuccessSet } from "@/lib/circuit";
import { resendClient } from "@/lib/email";
import { log } from "@/lib/logger";

const ALERT_TTL = 60 * 60; // 1 hour dedup window

function lookupEndpointOwner(endpointId: string) {
  return db
    .select({
      url: schema.endpoint.url,
      orgName: schema.organization.name,
      ownerEmail: schema.user.email,
    })
    .from(schema.endpoint)
    .innerJoin(
      schema.organization,
      eq(schema.organization.id, schema.endpoint.organizationId)
    )
    .innerJoin(
      schema.member,
      eq(schema.member.organizationId, schema.endpoint.organizationId)
    )
    .innerJoin(schema.user, eq(schema.user.id, schema.member.userId))
    .where(eq(schema.endpoint.id, endpointId))
    .limit(1);
}

function sendCircuitBreakerAlert(
  endpointId: string,
  failureCount: number
): void {
  (async () => {
    try {
      const isFirst = await setnx(`org:circuit-alert:${endpointId}`, ALERT_TTL);
      if (!isFirst) return;

      const [result] = await lookupEndpointOwner(endpointId);
      if (!result) return;

      const html = await render(
        FailureAlertEmail({
          endpointUrl: result.url,
          failureCount,
          dashboardUrl: env.DASHBOARD_URL,
        })
      );

      await resendClient.sendEmail({
        to: result.ownerEmail,
        subject: `Endpoint paused: ${result.url}`,
        html,
      });
    } catch (err) {
      log.error(
        { err, endpointId },
        "Failed to send circuit breaker alert email"
      );
    }
  })();
}

function sendRecoveryAlert(endpointId: string): void {
  (async () => {
    try {
      const isFirst = await setnx(`org:circuit-recovered:${endpointId}`, ALERT_TTL);
      if (!isFirst) return;

      const [result] = await lookupEndpointOwner(endpointId);
      if (!result) return;

      const html = await render(
        EndpointRecoveredEmail({
          endpointUrl: result.url,
          recoveredAt: new Date().toLocaleString("en-US", {
            dateStyle: "long",
            timeStyle: "short",
          }),
          dashboardUrl: env.DASHBOARD_URL,
        })
      );

      await resendClient.sendEmail({
        to: result.ownerEmail,
        subject: `Endpoint recovered: ${result.url}`,
        html,
      });
    } catch (err) {
      log.error({ err, endpointId }, "Failed to send recovery alert email");
    }
  })();
}

type EndpointState = Pick<
  typeof schema.endpoint.$inferSelect,
  "status" | "circuitState" | "circuitOpenedAt" | "failureCount"
>;
type DeliveryState = Pick<typeof schema.delivery.$inferSelect, "status" | "attempts">;
type AttemptWriterTx = Pick<typeof db, "insert" | "update">;

type BaseJobData = {
  deliveryId: string;
  payload: string;
  endpoint: {
    id: string;
    secret: string;
    previousSecret?: string | null;
    timeoutMs: number;
    maxAttempts: number;
  };
};

export type DeliveryConfig<TJob extends BaseJobData = BaseJobData> = {
  label: string;
  deliveryTable: typeof schema.delivery | typeof schema.inboundDelivery;
  endpointTable: typeof schema.endpoint | typeof schema.inboundEndpoint;
  getDeliveryStmt: { execute: (params: Record<string, unknown>) => Promise<DeliveryState[]> };
  getEndpointStmt: { execute: (params: Record<string, unknown>) => Promise<EndpointState[]> };
  completedStatus: string;
  buildStatusSet: (status: string) => Record<string, unknown>;
  buildSuccessSet: (params: {
    attempts: number;
    now: Date;
    responseStatus: number;
    durationMs: number;
  }) => Record<string, unknown>;
  buildFailureSet: (params: {
    attempts: number;
    now: Date;
    isFinalAttempt: boolean;
    durationMs: number;
    error: string;
  }) => Record<string, unknown>;
  recordAttempt?: (params: {
    tx: AttemptWriterTx;
    job: TJob;
    deliveryId: string;
    attempts: number;
    now: Date;
    startedAt: Date;
    durationMs: number;
    isFinalAttempt: boolean;
    responseStatus?: number;
    error?: string;
  }) => Promise<void>;
  buildRequest: (params: {
    payload: string;
    timestamp: number;
    signature: string;
    deliveryId: string;
    job: TJob;
  }) => { url: string; headers: Record<string, string>; body: string };
  transformPayload?: (payload: string, job: TJob) => Promise<string | null>;
};

export async function processDelivery<TJob extends BaseJobData>(
  config: DeliveryConfig<TJob>,
  job: Job<TJob>
) {
  const { deliveryId, endpoint: ep } = job.data;

  const [[deliveryRecord], [endpointState]] = await Promise.all([
    config.getDeliveryStmt.execute({ id: deliveryId }),
    config.getEndpointStmt.execute({ id: ep.id }),
  ]);

  if (!deliveryRecord) {
    log.warn({ deliveryId }, `${config.label} delivery not found, skipping`);
    return;
  }

  if (deliveryRecord.status === config.completedStatus) {
    log.info({ deliveryId }, `Already ${config.completedStatus}, skipping`);
    return;
  }

  if (!endpointState) {
    log.error({ endpointId: ep.id }, `${config.label} endpoint not found`);
    throw new Error(`${config.label} endpoint ${ep.id} not found`);
  }

  if (endpointState.status === "disabled") {
    log.info(
      { endpointId: ep.id },
      `${config.label} endpoint disabled, marking as skipped`
    );
    await db
      .update(config.deliveryTable)
      .set(config.buildStatusSet("skipped"))
      .where(eq(config.deliveryTable.id, deliveryId));
    return;
  }

  if (endpointState.status === "paused") {
    log.info(
      { endpointId: ep.id },
      `${config.label} endpoint paused, marking as paused`
    );
    await db
      .update(config.deliveryTable)
      .set(config.buildStatusSet("paused"))
      .where(eq(config.deliveryTable.id, deliveryId));
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
      .update(config.deliveryTable)
      .set(config.buildStatusSet("circuit_open"))
      .where(eq(config.deliveryTable.id, deliveryId));
    return;
  }

  if (shouldTransitionToHalfOpen(circuitState)) {
    await db
      .update(config.endpointTable)
      .set({ circuitState: "half_open", updatedAt: new Date() })
      .where(eq(config.endpointTable.id, ep.id));
  }

  let finalPayload = job.data.payload;

  if (config.transformPayload) {
    const result = await config.transformPayload(finalPayload, job.data);
    if (result === null) {
      return;
    }
    finalPayload = result;
  }

  const now = new Date();
  const timestamp = Math.floor(now.getTime() / 1000);
  const signedPayload = `${timestamp}.${finalPayload}`;

  const request = config.buildRequest({
    payload: finalPayload,
    timestamp,
    signature: signedPayload,
    deliveryId,
    job: job.data,
  });

  const startedAt = new Date();
  const start = performance.now();

  try {
    if (!(await isSafeWebhookUrl(request.url))) {
      throw new Error("Blocked unsafe destination URL");
    }

    const response = await fetch(request.url, {
      method: "POST",
      headers: request.headers,
      body: request.body,
      signal: AbortSignal.timeout(ep.timeoutMs),
    });

    const durationMs = Math.round(performance.now() - start);

    if (response.ok) {
      const attempts = deliveryRecord.attempts + 1;
      const wasCircuitBroken =
        circuitState.circuitState === "open" ||
        circuitState.circuitState === "half_open";

      await db.transaction(async (tx) => {
        await tx
          .update(config.deliveryTable)
          .set(
            config.buildSuccessSet({
              attempts,
              now,
              responseStatus: response.status,
              durationMs,
            })
          )
          .where(eq(config.deliveryTable.id, deliveryId));

        await tx
          .update(config.endpointTable)
          .set(circuitSuccessSet(now))
          .where(eq(config.endpointTable.id, ep.id));

        if (config.recordAttempt) {
          await config.recordAttempt({
            tx,
            job: job.data,
            deliveryId,
            attempts,
            now,
            startedAt,
            durationMs,
            isFinalAttempt: false,
            responseStatus: response.status,
          });
        }
      });

      if (wasCircuitBroken) {
        log.info(
          { endpointId: ep.id },
          "Circuit breaker closed, endpoint recovered"
        );
        sendRecoveryAlert(ep.id);
      }

      log.info(
        { deliveryId, status: response.status },
        `${config.label} delivered successfully`
      );
    } else {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (error) {
    const durationMs = Math.round(performance.now() - start);
    const attempts = deliveryRecord.attempts + 1;
    const maxAttempts = ep.maxAttempts;
    const isFinalAttempt = attempts >= maxAttempts;

    const failureError = String(error).slice(0, 500);
    let endpointResult:
      | { failureCount: number; circuitState: string }
      | undefined;

    await db.transaction(async (tx) => {
      await tx
        .update(config.deliveryTable)
        .set(
          config.buildFailureSet({
            attempts,
            now,
            isFinalAttempt,
            durationMs,
            error: failureError,
          })
        )
        .where(eq(config.deliveryTable.id, deliveryId));

      const result = await tx
        .update(config.endpointTable)
        .set(circuitFailureSet(config.endpointTable, now))
        .where(eq(config.endpointTable.id, ep.id))
        .returning({
          failureCount: config.endpointTable.failureCount,
          circuitState: config.endpointTable.circuitState,
        });
      endpointResult = result[0];

      if (config.recordAttempt) {
        await config.recordAttempt({
          tx,
          job: job.data,
          deliveryId,
          attempts,
          now,
          startedAt,
          durationMs,
          isFinalAttempt,
          error: failureError,
        });
      }
    });

    if (
      endpointResult?.circuitState === "open" &&
      endpointResult.failureCount === CIRCUIT_CONFIG.failureThreshold
    ) {
      log.warn(
        { endpointId: ep.id, failureCount: endpointResult.failureCount },
        "Circuit breaker opened"
      );

      // Fire-and-forget: send failure alert email to org owner
      sendCircuitBreakerAlert(ep.id, endpointResult.failureCount);
    }

    log.error(
      { deliveryId, attempts, maxAttempts, error: String(error).slice(0, 200) },
      `${config.label} delivery failed`
    );

    if (!isFinalAttempt) {
      throw error;
    }
  }
}
