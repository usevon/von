import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import * as schema from "@/schema"
import { env } from "./env"

const client = postgres(env.DATABASE_URL)
export const db = drizzle(client, { schema })

export async function checkDatabaseConnection(): Promise<{ ok: boolean; url: string }> {
  try {
    await client`SELECT 1`
    return { ok: true, url: env.DATABASE_URL }
  } catch {
    return { ok: false, url: env.DATABASE_URL }
  }
}

export * from "@/schema"
