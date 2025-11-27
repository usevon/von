import { Elysia } from "elysia"
import { createAuth, type Auth } from "@von/auth"
import { getRedisClient } from "@von/queue"
import { db } from "@von/db"
import { env } from "@/env"
import { UnauthorizedError } from "@/lib/errors"

const redis = getRedisClient()

const betterAuth: Auth = createAuth(db, {
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL ?? `http://localhost:${env.PORT}`,
  trustedOrigins: env.NODE_ENV === "development"
    ? ["http://localhost:5174"]
    : [],
  secondaryStorage: {
    get: async (key) => await redis.get(key),
    set: async (key, value, ttl) => {
      if (ttl) {
        await redis.setex(key, ttl, value)
      } else {
        await redis.set(key, value)
      }
    },
    delete: async (key) => {
      await redis.del(key)
    },
  },
})

export const auth = new Elysia({ name: "better-auth" })
  .mount(betterAuth.handler)

export const withApiKey = new Elysia({ name: "api-key-auth" })
  .resolve({ as: "scoped" }, async ({ headers }) => {
    const authHeader = headers["authorization"]
    if (!authHeader?.startsWith("Bearer ")) {
      throw new UnauthorizedError("Invalid API key.")
    }
    const rawKey = authHeader.slice(7)

    const result = await betterAuth.api.verifyApiKey({ body: { key: rawKey } })
    if (!result.valid) {
      throw new UnauthorizedError("Invalid API key.")
    }

    const organizationId = result.key?.organizationId
    if (!organizationId) {
      throw new UnauthorizedError("Invalid API key.")
    }

    return {
      apiKey: result.key,
      organizationId,
      userId: result.key?.userId ?? "",
    }
  })

export const withSession = new Elysia({ name: "session-auth" })
  .resolve({ as: "scoped" }, async ({ headers }) => {
    const session = await betterAuth.api.getSession({ headers })
    if (!session) {
      throw new UnauthorizedError("Please sign in.")
    }

    const organizationId = session.session?.activeOrganizationId
    if (!organizationId) {
      throw new UnauthorizedError("No active organization.")
    }

    return {
      user: session.user,
      session: session.session,
      organizationId,
      userId: session.user?.id ?? "",
    }
  })

export { betterAuth }
