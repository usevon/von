/**
 * Von Auth Server
 *
 * Centralized authentication using better-auth/minimal with Drizzle adapter.
 * Uses UUID for primary keys and includes organization and a forked api key plugin.
 */
import { betterAuth } from "better-auth/minimal"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { organization } from "better-auth/plugins"
import { vonApiKey } from "@/plugins/von-api-key"

export type CreateAuthOptions = {
  secret: string
  baseURL?: string
  trustedOrigins?: string[]
}

export const createAuth = (
  db: Parameters<typeof drizzleAdapter>[0],
  options: CreateAuthOptions
) => {
  return betterAuth({
    database: drizzleAdapter(db, { provider: "pg" }),
    secret: options.secret,
    baseURL: options.baseURL,
    trustedOrigins: options.trustedOrigins,
    emailAndPassword: {
      enabled: true,
    },
    advanced: {
      database: {
        generateId: "uuid",
      },
    },
    plugins: [
      organization(),
      vonApiKey(),
    ],
  })
}

export type Auth = ReturnType<typeof createAuth>

export { vonApiKey } from "@/plugins/von-api-key"
export type { VonApiKeyOptions, VonApiKey } from "@/plugins/von-api-key"
