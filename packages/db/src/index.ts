import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "./env";
import * as schema from "./schema";

const client = postgres(env.DATABASE_URL, {
  max: 20,
  idle_timeout: 20,
  connect_timeout: 10,
});
export const db = drizzle(client, { schema });
export type Database = typeof db;

export async function checkDatabaseConnection(): Promise<{ ok: boolean }> {
  try {
    await client`SELECT 1`;
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export async function closeDatabase(): Promise<void> {
  await client.end();
}

export { and, eq, inArray, or, sql } from "drizzle-orm";
export * from "./schema";
