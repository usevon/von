import { createAuthEndpoint, APIError, getSessionFromCtx } from "better-auth/api"
import { z } from "zod"
import type { ApiKey, PredefinedApiKeyOptions } from "../types"

const API_KEY_TABLE_NAME = "apikey"

export function deleteApiKey({ opts }: { opts: PredefinedApiKeyOptions }) {
  return createAuthEndpoint(
    "/api-key/delete",
    {
      method: "POST",
      body: z.object({
        keyId: z.string(),
      }),
    },
    async (ctx) => {
      const session = await getSessionFromCtx(ctx)
      const authRequired = ctx.request || ctx.headers

      if (authRequired && !session) {
        throw new APIError("UNAUTHORIZED", {
          message: "Unauthorized or invalid session",
        })
      }

      const apiKey = await ctx.context.adapter.findOne<ApiKey>({
        model: API_KEY_TABLE_NAME,
        where: [{ field: "id", value: ctx.body.keyId }],
      })

      if (!apiKey) {
        throw new APIError("NOT_FOUND", {
          message: "API Key not found",
        })
      }

      // Verify ownership
      if (session && apiKey.userId !== session.user.id) {
        throw new APIError("FORBIDDEN", {
          message: "You do not have permission to delete this API key",
        })
      }

      await ctx.context.adapter.delete({
        model: API_KEY_TABLE_NAME,
        where: [{ field: "id", value: ctx.body.keyId }],
      })

      return ctx.json({ success: true })
    }
  )
}
