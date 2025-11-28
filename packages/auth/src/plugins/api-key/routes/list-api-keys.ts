import { createAuthEndpoint, APIError, getSessionFromCtx } from "better-auth/api"
import { z } from "zod"
import type { ApiKey, PredefinedApiKeyOptions } from "../types"

const API_KEY_TABLE_NAME = "apikey"

export function listApiKeys({ opts }: { opts: PredefinedApiKeyOptions }) {
  return createAuthEndpoint(
    "/api-key/list",
    {
      method: "GET",
      query: z.object({
        userId: z.string().optional(),
      }).optional(),
    },
    async (ctx) => {
      const session = await getSessionFromCtx(ctx)
      const authRequired = ctx.request || ctx.headers

      const user =
        authRequired && !session
          ? null
          : session?.user || { id: ctx.query?.userId }

      if (!user?.id) {
        throw new APIError("UNAUTHORIZED", {
          message: "Unauthorized or invalid session",
        })
      }

      const keys = await ctx.context.adapter.findMany<ApiKey>({
        model: API_KEY_TABLE_NAME,
        where: [{ field: "userId", value: user.id }],
        sortBy: { field: "createdAt", direction: "desc" },
      })

      // Remove hashed key from response
      return ctx.json(
        keys.map(({ key: _, ...k }) => k)
      )
    }
  )
}
