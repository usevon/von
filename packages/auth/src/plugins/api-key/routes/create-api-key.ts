import { createAuthEndpoint, APIError, getSessionFromCtx } from "better-auth/api"
import { z } from "zod"
import type { ApiKey, PredefinedApiKeyOptions } from "../types"
import { setApiKey } from "../adapter"

const API_KEY_TABLE_NAME = "apikey"

export const ERROR_CODES = {
  UNAUTHORIZED_SESSION: "Unauthorized or invalid session",
  EXPIRES_IN_IS_TOO_LARGE: "The expiresIn is larger than the predefined maximum value.",
  INVALID_NAME_LENGTH: "The name length is either too large or too small.",
  NAME_REQUIRED: "API Key name is required.",
} as const

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

function getDate(seconds: number): Date {
  return new Date(Date.now() + seconds * 1000)
}

export function createApiKey({
  keyGenerator,
  opts,
}: {
  keyGenerator: (options: {
    length: number
    prefix: string | undefined
    environment?: string
  }) => Promise<string> | string
  opts: PredefinedApiKeyOptions
}) {
  return createAuthEndpoint(
    "/api-key/create",
    {
      method: "POST",
      body: z.object({
        name: z.string().optional(),
        expiresIn: z.number().min(1).optional().nullable().default(null),
        userId: z.coerce.string().optional(),
        environment: z.enum(["dev", "staging", "prod"]).optional(),
        organizationId: z.string().optional(),
      }),
    },
    async (ctx) => {
      const { name, expiresIn, environment, organizationId } = ctx.body

      const session = await getSessionFromCtx(ctx)
      const authRequired = ctx.request || ctx.headers
      const user =
        authRequired && !session
          ? null
          : session?.user || { id: ctx.body.userId }

      if (!user?.id) {
        throw new APIError("UNAUTHORIZED", {
          message: ERROR_CODES.UNAUTHORIZED_SESSION,
        })
      }

      if (session && ctx.body.userId && session?.user.id !== ctx.body.userId) {
        throw new APIError("UNAUTHORIZED", {
          message: ERROR_CODES.UNAUTHORIZED_SESSION,
        })
      }

      // Validate expiresIn
      if (expiresIn) {
        const expiresInDays = expiresIn / (60 * 60 * 24)
        if (opts.keyExpiration.maxExpiresIn < expiresInDays) {
          throw new APIError("BAD_REQUEST", {
            message: ERROR_CODES.EXPIRES_IN_IS_TOO_LARGE,
          })
        }
      }

      // Validate name
      if (name) {
        if (name.length > opts.maximumNameLength) {
          throw new APIError("BAD_REQUEST", {
            message: ERROR_CODES.INVALID_NAME_LENGTH,
          })
        }
      } else if (opts.requireName) {
        throw new APIError("BAD_REQUEST", {
          message: ERROR_CODES.NAME_REQUIRED,
        })
      }

      const env = environment ?? opts.defaultEnvironment
      const key = await keyGenerator({
        length: opts.defaultKeyLength,
        prefix: undefined,
        environment: env,
      })

      const hashed = opts.disableKeyHashing ? key : await defaultKeyHasher(key)
      const start = key.substring(0, opts.startingCharactersLength)

      const data: Omit<ApiKey, "id"> = {
        name: name ?? null,
        start,
        key: hashed,
        userId: user.id,
        organizationId: organizationId ?? null,
        environment: env,
        enabled: true,
        expiresAt: expiresIn
          ? getDate(expiresIn)
          : opts.keyExpiration.defaultExpiresIn
            ? getDate(opts.keyExpiration.defaultExpiresIn)
            : null,
        requestCount: 0,
        lastRequest: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const apiKey = await ctx.context.adapter.create<Omit<ApiKey, "id">, ApiKey>({
        model: API_KEY_TABLE_NAME,
        data,
      })

      // Store in secondary storage (Redis) if configured
      await setApiKey(ctx as never, apiKey, opts)

      return ctx.json({
        ...apiKey,
        key, // Return unhashed key to user (only time they see it)
      })
    }
  )
}
