import { Elysia } from "elysia"
import { createAuth, type Auth } from "@von/auth"
import { db } from "@von/db"
import { env } from "@von/env"

const betterAuth: Auth = createAuth(db, {
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL ?? `http://localhost:${env.PORT}`,
  trustedOrigins: env.NODE_ENV === "development"
    ? ["http://localhost:5173", "http://localhost:5174"]
    : [],
})

export const auth = new Elysia({ name: "better-auth" })
  .mount(betterAuth.handler)

export const withApiKey = new Elysia({ name: "api-key-auth" })
  .derive({ as: "scoped" }, async ({ headers, set }) => {
    const key = headers["x-api-key"]
    if (!key) {
      set.status = 401
      throw new Error("Missing API key")
    }

    const result = await betterAuth.api.verifyApiKey({ body: { key } })
    if (!result.valid) {
      set.status = 401
      throw new Error(result.error?.message ?? "Invalid API key")
    }

    const organizationId = result.key?.organizationId
    if (!organizationId) {
      set.status = 401
      throw new Error("API key must be associated with an organization")
    }

    return {
      apiKey: result.key,
      organizationId,
      userId: result.key?.userId ?? "",
    }
  })

export { betterAuth }
