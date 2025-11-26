import { createAuthEndpoint, APIError } from "better-auth/api"
import { z } from "zod"
import type { ApiKey, PredefinedApiKeyOptions } from "../types"
import { getApiKey, setApiKey, deleteApiKey as deleteApiKeyFromStorage } from "../adapter"

const API_KEY_TABLE_NAME = "apikey"

export const ERROR_CODES = {
  INVALID_API_KEY: "Invalid API key.",
  KEY_DISABLED: "API Key is disabled",
  KEY_EXPIRED: "API Key has expired",
  FAILED_TO_UPDATE_API_KEY: "Failed to update API key",
} as const

type AuthContext = {
  adapter: {
    findOne: <T>(options: {
      model: string
      where: Array<{ field: string; value: unknown }>
    }) => Promise<T | null>
    update: <T>(options: {
      model: string
      where: Array<{ field: string; value: unknown }>
      update: Partial<T>
    }) => Promise<T | null>
    delete: (options: {
      model: string
      where: Array<{ field: string; value: unknown }>
    }) => Promise<void>
  }
  logger: {
    error: (message: string, ...args: unknown[]) => void
  }
  secondaryStorage?: {
    get: (key: string) => Promise<unknown> | unknown
    set: (key: string, value: string, ttl?: number) => Promise<void | null | unknown> | void
    delete: (key: string) => Promise<void | null | string> | void
  } | null
}

type GenericEndpointContext = {
  context: AuthContext
}

// Use Bun.CryptoHasher if available (faster), fallback to Web Crypto
function defaultKeyHasher(key: string): string | Promise<string> {
  const g = globalThis as { Bun?: { CryptoHasher?: new (algo: string) => { update(data: string): void; digest(encoding: string): string } } }
  if (g.Bun?.CryptoHasher) {
    const hasher = new g.Bun.CryptoHasher("sha256")
    hasher.update(key)
    return hasher.digest("hex")
  }
  return (async () => {
    const encoder = new TextEncoder()
    const data = encoder.encode(key)
    const hashBuffer = await crypto.subtle.digest("SHA-256", data)
    const hashArray = new Uint8Array(hashBuffer)
    const HEX = "0123456789abcdef"
    let hex = ""
    for (let i = 0; i < hashArray.length; i++) {
      const byte = hashArray[i]!
      hex += HEX[byte >> 4]! + HEX[byte & 0xf]!
    }
    return hex
  })()
}

export async function validateApiKey({
  hashedKey,
  ctx,
  opts,
}: {
  hashedKey: string
  opts: PredefinedApiKeyOptions
  ctx: GenericEndpointContext
}): Promise<ApiKey> {
  // Use adapter to get from Redis (if configured) or database
  const apiKey = await getApiKey(ctx, hashedKey, opts)

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
      // Delete expired key from database
      try {
        await ctx.context.adapter.delete({
          model: API_KEY_TABLE_NAME,
          where: [{ field: "id", value: apiKey.id }],
        })
        // Also remove from secondary storage
        await deleteApiKeyFromStorage(ctx, apiKey, opts)
      } catch (error) {
        ctx.context.logger.error("Failed to delete expired API key:", error)
      }

      throw new APIError("UNAUTHORIZED", {
        message: ERROR_CODES.KEY_EXPIRED,
      })
    }
  }

  // Update request count and last request time in database
  const updatedKey = await ctx.context.adapter.update<ApiKey>({
    model: API_KEY_TABLE_NAME,
    where: [{ field: "id", value: apiKey.id }],
    update: {
      requestCount: (apiKey.requestCount || 0) + 1,
      lastRequest: new Date(),
      updatedAt: new Date(),
    },
  })

  if (!updatedKey) {
    throw new APIError("INTERNAL_SERVER_ERROR", {
      message: ERROR_CODES.FAILED_TO_UPDATE_API_KEY,
    })
  }

  // Update secondary storage with new request count
  await setApiKey(ctx, updatedKey, opts)

  return updatedKey
}

export function verifyApiKey({
  opts,
}: {
  opts: PredefinedApiKeyOptions
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

      // Quick validation: check length first (cheap)
      if (key.length < opts.defaultKeyLength) {
        return ctx.json({
          valid: false,
          error: {
            message: ERROR_CODES.INVALID_API_KEY,
            code: "KEY_NOT_FOUND" as const,
          },
          key: null,
        })
      }

      // Quick validation: check valid prefix before expensive hash
      const validPrefixes = ["von_dev_", "von_stg_", "von_prod_"]
      const hasValidPrefix = validPrefixes.some((p) => key.startsWith(p))
      if (!hasValidPrefix) {
        return ctx.json({
          valid: false,
          error: {
            message: ERROR_CODES.INVALID_API_KEY,
            code: "KEY_NOT_FOUND" as const,
          },
          key: null,
        })
      }

      const hashed = opts.disableKeyHashing ? key : await defaultKeyHasher(key)

      try {
        const apiKey = await validateApiKey({
          hashedKey: hashed,
          ctx: ctx as unknown as GenericEndpointContext,
          opts,
        })

        const { key: _, ...returningApiKey } = apiKey

        return ctx.json({
          valid: true,
          error: null,
          key: returningApiKey,
        })
      } catch (error) {
        if (error instanceof APIError) {
          return ctx.json({
            valid: false,
            error: {
              message: (error.body as { message?: string })?.message,
              code: (error.body as { code?: string })?.code as string,
            },
            key: null,
          })
        }

        return ctx.json({
          valid: false,
          error: {
            message: ERROR_CODES.INVALID_API_KEY,
            code: "INVALID_API_KEY" as const,
          },
          key: null,
        })
      }
    }
  )
}
