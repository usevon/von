import { createAuthEndpoint, APIError, getSessionFromCtx } from "better-auth/api"
import { z } from "zod"
import type { ApiKey, PredefinedApiKeyOptions } from "../types"

const API_KEY_TABLE_NAME = "apikey"

export function getApiKey(_config: { opts: PredefinedApiKeyOptions }) {
  return createAuthEndpoint(
    "/api-key/get",
    {
      method: "GET",
      query: z.object({
        id: z.string(),
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
        where: [{ field: "id", value: ctx.query.id }],
      })

      if (!apiKey) {
        throw new APIError("NOT_FOUND", {
          message: "API Key not found",
        })
      }

      // Verify ownership
      if (session && apiKey.userId !== session.user.id) {
        throw new APIError("FORBIDDEN", {
          message: "You do not have permission to view this API key",
        })
      }

      const { key: _, ...safeKey } = apiKey
      return ctx.json(safeKey)
    }
  )
}
