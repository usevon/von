/**
 * Von Auth Server
 *
 * Centralized authentication using better-auth/minimal with Drizzle adapter.
 * Uses UUID for primary keys and includes organization and a custom api key plugin.
 */
import { betterAuth } from "better-auth/minimal"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { organization } from "better-auth/plugins"
import { apiKey } from "@/plugins/api-key"

export type SecondaryStorage = {
  get: (key: string) => Promise<string | null> | string | null
  set: (key: string, value: string, ttl?: number) => Promise<void> | void
  delete: (key: string) => Promise<void> | void
}

export type CreateAuthOptions = {
  secret: string
  baseURL?: string
  trustedOrigins?: string[]
  /**
   * Secondary storage for API key caching (Redis).
   * Enables faster API key lookups by caching in Redis with DB fallback.
   */
  secondaryStorage: SecondaryStorage
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
    user: {
      deleteUser: {
        enabled: true,
      },
    },
    session: {
      cookieCache: {
        enabled: true,
        maxAge: 5 * 60,
      },
    },
    experimental: {
      joins: true,
    },
    advanced: {
      cookiePrefix: "von",
      database: {
        generateId: () => crypto.randomUUID(),
      },
    },
    plugins: [
      organization(),
      apiKey({
        storage: "secondary-storage",
        fallbackToDatabase: true,
        customStorage: options.secondaryStorage,
      }),
    ],
    databaseHooks: {
      session: {
        create: {
          before: async (session, ctx) => {
            if (session.activeOrganizationId) {
              return { data: session }
            }
            const members = await ctx?.context?.adapter?.findMany<{ organizationId: string }>({
              model: "member",
              where: [{ field: "userId", value: session.userId }],
              limit: 1,
            })
            const firstMember = members?.[0]
            if (firstMember) {
              return {
                data: { ...session, activeOrganizationId: firstMember.organizationId },
              }
            }
            return { data: session }
          },
        },
      },
    },
  })
}

export type Auth = ReturnType<typeof createAuth>
export type Session = Auth["$Infer"]["Session"]
export type User = Session["user"]

export { apiKey } from "@/plugins/api-key"
export type { ApiKeyOptions, ApiKey } from "@/plugins/api-key"

export const generateId = () => crypto.randomUUID()
