import { createAuthEndpoint, APIError } from "better-auth/api"
import { z } from "zod"
import type { ApiKey, ResolvedApiKeyOptions } from "@/plugins/api-key/types"
import { getApiKey, deleteApiKey as deleteApiKeyFromStorage } from "@/plugins/api-key/adapter"
import { hashKey, verifySignature, hasValidPrefix } from "@/plugins/api-key/crypto"
import { ERROR_CODES } from "@/plugins/api-key"

const API_KEY_TABLE_NAME = "apikey"

type EndpointContext = {
  context: {
    adapter: {
      findOne: <T>(opts: { model: string; where: { field: string; value: unknown }[] }) => Promise<T | null>
      delete: (opts: { model: string; where: { field: string; value: unknown }[] }) => Promise<void>
    }
    logger: { error: (msg: string, ...args: unknown[]) => void }
    secondaryStorage?: {
      get: (key: string) => Promise<unknown> | unknown
      set: (key: string, value: string, ttl?: number) => Promise<void | null | unknown> | void
      delete: (key: string) => Promise<void | null | string> | void
    } | null
  }
}

export async function validateApiKey({
  hashedKey,
  ctx,
  opts,
}: {
  hashedKey: string
  opts: ResolvedApiKeyOptions
  ctx: EndpointContext
}): Promise<ApiKey> {
  const apiKey = await getApiKey(ctx as never, hashedKey, opts)

  if (!apiKey) {
    throw new APIError("UNAUTHORIZED", {
      message: ERROR_CODES.INVALID_API_KEY,
    })
  }

  if (apiKey.enabled === false) {
    throw new APIError("UNAUTHORIZED", {
      message: ERROR_CODES.KEY_DISABLED,
    })
  }

  if (apiKey.expiresAt) {
    const now = Date.now()
    const expiresAt = new Date(apiKey.expiresAt).getTime()
    if (now > expiresAt) {
      try {
        await ctx.context.adapter.delete({
          model: API_KEY_TABLE_NAME,
          where: [{ field: "id", value: apiKey.id }],
        })
        await deleteApiKeyFromStorage(ctx, apiKey, opts)
      } catch (error) {
        ctx.context.logger.error("Failed to delete expired API key:", error)
      }

      throw new APIError("UNAUTHORIZED", {
        message: ERROR_CODES.KEY_EXPIRED,
      })
    }
  }

  return apiKey
}

export function verifyApiKey({
  opts,
  keyLength,
}: {
  opts: ResolvedApiKeyOptions
  keyLength: number
}) {
  return createAuthEndpoint(
    "/api-key/verify",
    {
      method: "POST",
      body: z.object({
        key: z.string(),
      }),
      metadata: {
        SERVER_ONLY: true,
      },
    },
    async (ctx) => {
      const { key } = ctx.body

      if (key.length < keyLength) {
        return ctx.json({
          valid: false,
          error: { message: ERROR_CODES.INVALID_API_KEY, code: "INVALID_KEY" },
          key: null,
        })
      }

      if (!hasValidPrefix(key)) {
        return ctx.json({
          valid: false,
          error: { message: ERROR_CODES.INVALID_API_KEY, code: "INVALID_KEY" },
          key: null,
        })
      }

      if (opts.signingSecret) {
        if (!verifySignature(key, opts.signingSecret)) {
          return ctx.json({
            valid: false,
            error: { message: ERROR_CODES.INVALID_API_KEY, code: "INVALID_SIGNATURE" },
            key: null,
          })
        }
      }

      const hashed = hashKey(key)

      try {
        const { key: _hash, ...apiKeyData } = await validateApiKey({
          hashedKey: hashed,
          ctx: ctx as never,
          opts,
        })

        return ctx.json({
          valid: true,
          error: null,
          key: apiKeyData,
        })
      } catch (error) {
        if (error instanceof APIError) {
          return ctx.json({
            valid: false,
            error: {
              message: (error.body as { message?: string })?.message ?? ERROR_CODES.INVALID_API_KEY,
              code: "INVALID_KEY",
            },
            key: null,
          })
        }

        return ctx.json({
          valid: false,
          error: { message: ERROR_CODES.INVALID_API_KEY, code: "INVALID_KEY" },
          key: null,
        })
      }
    }
  )
}
