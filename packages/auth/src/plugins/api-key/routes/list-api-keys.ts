import { createAuthEndpoint, APIError, getSessionFromCtx } from "better-auth/api"
import type { ApiKey } from "../types"
import { ERROR_CODES } from "../index"

const API_KEY_TABLE_NAME = "apikey"

export function listApiKeys() {
  return createAuthEndpoint(
    "/api-key/list",
    {
      method: "GET",
    },
    async (ctx) => {
      const session = await getSessionFromCtx(ctx)
      if (!session) {
        throw new APIError("UNAUTHORIZED", {
          message: ERROR_CODES.UNAUTHORIZED_SESSION,
        })
      }

      const keys = await ctx.context.adapter.findMany<ApiKey>({
        model: API_KEY_TABLE_NAME,
        where: [{ field: "userId", value: session.user.id }],
        sortBy: { field: "createdAt", direction: "desc" },
      })

      return ctx.json(keys.map(({ key: _, ...k }) => k))
    }
  )
}
