import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import * as schema from "@/schema"
import { env } from "@/env"

const client = postgres(env.DATABASE_URL, {
  max: 20,
  idle_timeout: 20,
  connect_timeout: 10,
  connection: {
    statement_timeout: "30s",
  },
})
export const db = drizzle(client, { schema })

export async function checkDatabaseConnection(): Promise<{ ok: boolean }> {
  try {
    await client`SELECT 1`
    return { ok: true }
  } catch {
    return { ok: false }
  }
}

export async function closeDatabase(): Promise<void> {
  await client.end()
}

export * from "@/schema"
export { eq, and, or, inArray, sql } from "drizzle-orm"
