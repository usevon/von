import { db } from "@usevon/db";
import {
  CIRCUIT_CONFIG,
  type CircuitState,
  isCircuitOpen,
  shouldTransitionToHalfOpen,
} from "@usevon/utils";
import { circuitFailureSet, circuitSuccessSet } from "@/lib/circuit";
import { log } from "@/lib/logger";
import { eq } from "drizzle-orm";
import type { PgColumn, PgTableWithColumns } from "drizzle-orm/pg-core";
import type { Job } from "bullmq";

type Executable = {
  execute: (params: Record<string, unknown>) => Promise<any[]>;
};

type EndpointState = {
  status: string;
  circuitState: string;
  circuitOpenedAt: Date | null;
  failureCount: number;
};

type CircuitColumns = {
  failureCount: PgColumn;
  circuitState: PgColumn;
  circuitOpenedAt: PgColumn;
};

type BaseJobData = {
  deliveryId: string;
  payload: string;
  endpoint: {
    id: string;
    secret: string;
    previousSecret?: string | null;
    timeoutMs: number;
    retryCount: number;
  };
};

export type DeliveryConfig<TJob extends BaseJobData = BaseJobData> = {
  label: string;
  deliveryTable: PgTableWithColumns<any>;
  endpointTable: PgTableWithColumns<any> & CircuitColumns;
  getDeliveryStmt: Executable;
  getEndpointStmt: Executable;
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
  job: Job<TJob>,
) {
  const { deliveryId, endpoint: ep } = job.data;

  const [[deliveryRecord], [endpointState]] = await Promise.all([
    config.getDeliveryStmt.execute({ id: deliveryId }) as Promise<any[]>,
    config.getEndpointStmt.execute({ id: ep.id }) as Promise<EndpointState[]>,
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
    log.info({ endpointId: ep.id }, `${config.label} endpoint disabled, marking as skipped`);
    await db
      .update(config.deliveryTable)
      .set(config.buildStatusSet("skipped"))
      .where(eq(config.deliveryTable.id, deliveryId));
    return;
  }

  if (endpointState.status === "paused") {
    log.info({ endpointId: ep.id }, `${config.label} endpoint paused, retrying later`);
    throw new Error("Endpoint paused");
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

  const start = performance.now();

  try {
    const response = await fetch(request.url, {
      method: "POST",
      headers: request.headers,
      body: request.body,
      signal: AbortSignal.timeout(ep.timeoutMs),
    });

    const durationMs = Math.round(performance.now() - start);

    if (response.ok) {
      await Promise.all([
        db
          .update(config.deliveryTable)
          .set(config.buildSuccessSet({
            attempts: deliveryRecord.attempts + 1,
            now,
            responseStatus: response.status,
            durationMs,
          }))
          .where(eq(config.deliveryTable.id, deliveryId)),
        db
          .update(config.endpointTable)
          .set(circuitSuccessSet(now))
          .where(eq(config.endpointTable.id, ep.id)),
      ]);

      log.info(
        { deliveryId, status: response.status },
        `${config.label} delivered successfully`,
      );
    } else {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (error) {
    const durationMs = Math.round(performance.now() - start);
    const attempts = deliveryRecord.attempts + 1;
    const maxAttempts = ep.retryCount;
    const isFinalAttempt = attempts >= maxAttempts;

    const [, [endpointResult]] = await Promise.all([
      db
        .update(config.deliveryTable)
        .set(config.buildFailureSet({
          attempts,
          now,
          isFinalAttempt,
          durationMs,
          error: String(error).slice(0, 500),
        }))
        .where(eq(config.deliveryTable.id, deliveryId)),
      db
        .update(config.endpointTable)
        .set(circuitFailureSet(config.endpointTable, now))
        .where(eq(config.endpointTable.id, ep.id))
        .returning({
          failureCount: config.endpointTable.failureCount,
          circuitState: config.endpointTable.circuitState,
        }),
    ]);

    if (
      endpointResult?.circuitState === "open" &&
      endpointResult.failureCount === CIRCUIT_CONFIG.failureThreshold
    ) {
      log.warn(
        { endpointId: ep.id, failureCount: endpointResult.failureCount },
        "Circuit breaker opened",
      );
    }

    log.error(
      { deliveryId, attempts, maxAttempts, error: String(error).slice(0, 200) },
      `${config.label} delivery failed`,
    );

    if (!isFinalAttempt) {
      throw error;
    }
  }
}
