import { createAuthEndpoint, APIError, getSessionFromCtx } from "better-auth/api"
import { z } from "zod"
import type { ApiKey, PredefinedApiKeyOptions } from "../types"
import { setApiKey } from "../adapter"

const API_KEY_TABLE_NAME = "apikey"

export function updateApiKey({ opts }: { opts: PredefinedApiKeyOptions }) {
  return createAuthEndpoint(
    "/api-key/update",
    {
      method: "POST",
      body: z.object({
        keyId: z.string(),
        name: z.string().optional(),
        enabled: z.boolean().optional(),
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

      const { keyId, name, enabled } = ctx.body

      const apiKey = await ctx.context.adapter.findOne<ApiKey>({
        model: API_KEY_TABLE_NAME,
        where: [{ field: "id", value: keyId }],
      })

      if (!apiKey) {
        throw new APIError("NOT_FOUND", {
          message: "API Key not found",
        })
      }

      // Verify ownership
      if (session && apiKey.userId !== session.user.id) {
        throw new APIError("FORBIDDEN", {
          message: "You do not have permission to update this API key",
        })
      }

      // Validate name length
      if (name && name.length > opts.maximumNameLength) {
        throw new APIError("BAD_REQUEST", {
          message: "Name is too long",
        })
      }

      const update: Partial<ApiKey> = {
        updatedAt: new Date(),
      }

      if (name !== undefined) update.name = name
      if (enabled !== undefined) update.enabled = enabled

      const updated = await ctx.context.adapter.update<ApiKey>({
        model: API_KEY_TABLE_NAME,
        where: [{ field: "id", value: keyId }],
        update,
      })

      if (!updated) {
        throw new APIError("INTERNAL_SERVER_ERROR", {
          message: "Failed to update API key",
        })
      }

      // Update secondary storage (Redis) if configured
      await setApiKey(ctx as never, updated, opts)

      const { key: _, ...safeKey } = updated
      return ctx.json(safeKey)
    }
  )
}
