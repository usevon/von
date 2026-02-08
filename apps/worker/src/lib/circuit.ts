import { CIRCUIT_CONFIG, getSuccessUpdate } from "@usevon/utils";
import { sql } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";

type CircuitColumns = {
  failureCount: PgColumn;
  circuitState: PgColumn;
  circuitOpenedAt: PgColumn;
};

export const circuitFailureSet = (table: CircuitColumns, now: Date) => {
  const threshold = CIRCUIT_CONFIG.failureThreshold;

  return {
    failureCount: sql`${table.failureCount} + 1`,
    circuitState: sql`CASE WHEN ${table.failureCount} + 1 >= ${threshold} THEN 'open' ELSE ${table.circuitState} END`,
    circuitOpenedAt: sql`CASE WHEN ${table.failureCount} + 1 >= ${threshold} AND ${table.circuitState} != 'open' THEN ${now.toISOString()} ELSE ${table.circuitOpenedAt} END`,
    lastFailureAt: now,
    updatedAt: now,
  };
};

export const circuitSuccessSet = (now: Date) => ({
  ...getSuccessUpdate(),
  lastSuccessAt: now,
  updatedAt: now,
});
