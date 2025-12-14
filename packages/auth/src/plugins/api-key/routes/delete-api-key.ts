import { createAuthEndpoint, APIError, getSessionFromCtx } from "better-auth/api"
import { z } from "zod"
import type { ApiKey, ResolvedApiKeyOptions } from "@/plugins/api-key/types"
import { deleteApiKey as deleteApiKeyFromStorage } from "@/plugins/api-key/adapter"
import { ERROR_CODES } from "@/plugins/api-key"

const API_KEY_TABLE_NAME = "apikey"

export function deleteApiKey({ opts }: { opts: ResolvedApiKeyOptions }) {
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
      if (!session) {
        throw new APIError("UNAUTHORIZED", {
          message: ERROR_CODES.UNAUTHORIZED_SESSION,
        })
      }

      const apiKey = await ctx.context.adapter.findOne<ApiKey>({
        model: API_KEY_TABLE_NAME,
        where: [{ field: "id", value: ctx.body.keyId }],
      })

      if (!apiKey) {
        throw new APIError("NOT_FOUND", {
          message: ERROR_CODES.KEY_NOT_FOUND,
        })
      }

      if (apiKey.userId !== session.user.id) {
        throw new APIError("FORBIDDEN", {
          message: "Access denied",
        })
      }

      await ctx.context.adapter.delete({
        model: API_KEY_TABLE_NAME,
        where: [{ field: "id", value: ctx.body.keyId }],
      })

      await deleteApiKeyFromStorage(ctx as never, apiKey, opts)

      return ctx.json({ success: true })
    }
  )
}
