import { db } from "@usevon/db";
import {
  CIRCUIT_CONFIG,
  type CircuitState,
  hmacSign,
  isCircuitOpen,
  shouldTransitionToHalfOpen,
} from "@usevon/utils";
import { circuitFailureSet, circuitSuccessSet } from "@/lib/circuit";
import { createLogger } from "@usevon/utils/logger";
import { eq } from "drizzle-orm";
import type { PgColumn, PgTableWithColumns } from "drizzle-orm/pg-core";
import { env } from "@/env";

type Executable = {
  execute: (params: Record<string, unknown>) => Promise<any[]>;
};

const log = createLogger({
  level: env.NODE_ENV === "development" ? "debug" : "info",
  pretty: env.NODE_ENV === "development",
});

type EndpointState = {
  enabled: boolean;
  circuitState: string;
  circuitOpenedAt: Date | null;
  failureCount: number;
};

type CircuitColumns = {
  failureCount: PgColumn;
  circuitState: PgColumn;
  circuitOpenedAt: PgColumn;
};

export type DeliveryConfig = {
  /** Label used in log messages (e.g. "Webhook", "Inbound") */
  label: string;
  /** The delivery table to update */
  deliveryTable: PgTableWithColumns<any>;
  /** The endpoint table to update */
  endpointTable: PgTableWithColumns<any> & CircuitColumns;
  /** Prepared statement: select delivery by id */
  getDeliveryStmt: Executable;
  /** Prepared statement: select endpoint state by id */
  getEndpointStmt: Executable;
  /** Status value that means "already completed" (e.g. "delivered" | "forwarded") */
  completedStatus: string;
  /** Build a delivery update set for status-only changes (skipped, circuit_open) */
  buildStatusSet: (status: string) => Record<string, unknown>;
  /** Build the success delivery update set */
  buildSuccessSet: (params: {
    attempts: number;
    now: Date;
    responseStatus: number;
  }) => Record<string, unknown>;
  /** Build the failure delivery update set */
  buildFailureSet: (params: {
    attempts: number;
    now: Date;
    isFinalAttempt: boolean;
  }) => Record<string, unknown>;
  /** Build the outgoing fetch request */
  buildRequest: (params: {
    payload: string;
    timestamp: number;
    signature: string;
    deliveryId: string;
    job: any;
  }) => { url: string; headers: Record<string, string>; body: string };
  /** Optional pre-fetch payload transform (e.g. version transforms for webhooks) */
  transformPayload?: (payload: string, job: any) => Promise<string | null>;
};

export async function processDelivery(
  config: DeliveryConfig,
  job: { data: { deliveryId: string; endpoint: { id: string; secret: string; timeoutMs: number; retryCount: number } } & Record<string, any> },
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

  if (!endpointState.enabled) {
    log.info({ endpointId: ep.id }, `${config.label} endpoint disabled, marking as skipped`);
    await db
      .update(config.deliveryTable)
      .set(config.buildStatusSet("skipped"))
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

  let finalPayload = job.data.payload as string;

  if (config.transformPayload) {
    const result = await config.transformPayload(finalPayload, job.data);
    if (result === null) {
      // Transform signaled failure (e.g. invalid JSON), delivery already updated
      return;
    }
    finalPayload = result;
  }

  const now = new Date();
  const timestamp = Math.floor(now.getTime() / 1000);
  const signedPayload = `${timestamp}.${finalPayload}`;
  const signature = hmacSign(signedPayload, ep.secret);

  const request = config.buildRequest({
    payload: finalPayload,
    timestamp,
    signature,
    deliveryId,
    job: job.data,
  });

  try {
    const response = await fetch(request.url, {
      method: "POST",
      headers: request.headers,
      body: request.body,
      signal: AbortSignal.timeout(ep.timeoutMs),
    });

    if (response.ok) {
      await Promise.all([
        db
          .update(config.deliveryTable)
          .set(config.buildSuccessSet({
            attempts: deliveryRecord.attempts + 1,
            now,
            responseStatus: response.status,
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
    const attempts = deliveryRecord.attempts + 1;
    const maxAttempts = ep.retryCount;
    const isFinalAttempt = attempts >= maxAttempts;

    const [, [endpointResult]] = await Promise.all([
      db
        .update(config.deliveryTable)
        .set(config.buildFailureSet({ attempts, now, isFinalAttempt }))
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
