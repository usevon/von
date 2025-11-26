import type { BetterAuthPlugin } from "better-auth"
import { createAuthMiddleware, APIError } from "better-auth/api"
import { createApiKeyRoutes } from "./routes"
import { validateApiKey } from "./routes/verify-api-key"
import { apiKeySchema } from "./schema"
import type { ApiKeyOptions, PredefinedApiKeyOptions } from "./types"

function generateRandomString(length: number, ...charsets: string[]): string {
  const chars = charsets.length > 0
    ? charsets.map(cs => {
        if (cs === "a-z") return "abcdefghijklmnopqrstuvwxyz"
        if (cs === "A-Z") return "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
        if (cs === "0-9") return "0123456789"
        return cs
      }).join("")
    : "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"

  let result = ""
  const randomValues = new Uint8Array(length)
  crypto.getRandomValues(randomValues)
  for (let i = 0; i < length; i++) {
    result += chars[randomValues[i]! % chars.length]
  }
  return result
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

function getDate(seconds: number): Date {
  return new Date(Date.now() + seconds * 1000)
}

function getIp(request: Request): string | null {
  const forwardedFor = request.headers.get("x-forwarded-for")
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() ?? null
  }
  return request.headers.get("x-real-ip") || null
}

function getEnvironmentPrefix(environment: string): string {
  const prefixMap: Record<string, string> = {
    dev: "von_dev_",
    staging: "von_stg_",
    prod: "von_prod_",
  }
  return prefixMap[environment] || "von_dev_"
}

export const ERROR_CODES = {
  UNAUTHORIZED_SESSION: "Unauthorized or invalid session",
  KEY_NOT_FOUND: "API Key not found",
  KEY_DISABLED: "API Key is disabled",
  KEY_EXPIRED: "API Key has expired",
  INVALID_API_KEY: "Invalid API key.",
  INVALID_USER_ID_FROM_API_KEY: "The user id from the API key is invalid.",
  INVALID_API_KEY_GETTER_RETURN_TYPE: "API Key getter returned an invalid key type. Expected string.",
} as const

export const API_KEY_TABLE_NAME = "apikey"

export const apiKey = (options?: ApiKeyOptions) => {
  const opts: PredefinedApiKeyOptions = {
    apiKeyHeaders: options?.apiKeyHeaders ?? "x-api-key",
    defaultKeyLength: options?.defaultKeyLength ?? 64,
    maximumNameLength: options?.maximumNameLength ?? 64,
    disableKeyHashing: options?.disableKeyHashing ?? false,
    requireName: options?.requireName ?? false,
    defaultEnvironment: options?.defaultEnvironment ?? "dev",
    keyExpiration: {
      defaultExpiresIn: options?.keyExpiration?.defaultExpiresIn ?? null,
      maxExpiresIn: options?.keyExpiration?.maxExpiresIn ?? 365,
    },
    startingCharactersLength: options?.startingCharactersLength ?? 12,
    enableSessionForAPIKeys: options?.enableSessionForAPIKeys ?? false,
    storage: options?.storage ?? "database",
    fallbackToDatabase: options?.fallbackToDatabase ?? false,
    customKeyGenerator: options?.customKeyGenerator,
    customStorage: options?.customStorage,
  }

  const schema = apiKeySchema()

  const getter = (ctx: { headers?: Headers | null }) => {
    if (Array.isArray(opts.apiKeyHeaders)) {
      for (const header of opts.apiKeyHeaders) {
        const value = ctx.headers?.get(header)
        if (value) {
          return value
        }
      }
    } else {
      return ctx.headers?.get(opts.apiKeyHeaders)
    }
    return null
  }

  const keyGenerator =
    opts.customKeyGenerator ||
    (async (keyOpts: { length: number; prefix: string | undefined; environment?: string }) => {
      const key = generateRandomString(keyOpts.length, "a-z", "A-Z")
      const envPrefix = getEnvironmentPrefix(keyOpts.environment || opts.defaultEnvironment)
      return `${envPrefix}${key}`
    })

  const routes = createApiKeyRoutes({ keyGenerator, opts })

  return {
    id: "api-key",
    $ERROR_CODES: ERROR_CODES,
    hooks: {
      before: [
        {
          matcher: (ctx: { headers?: Headers | null }) => !!getter(ctx) && opts.enableSessionForAPIKeys,
          handler: createAuthMiddleware(async (ctx) => {
            const key = getter(ctx)!

            if (typeof key !== "string") {
              throw new APIError("BAD_REQUEST", {
                message: ERROR_CODES.INVALID_API_KEY_GETTER_RETURN_TYPE,
              })
            }

            if (key.length < opts.defaultKeyLength) {
              throw new APIError("FORBIDDEN", {
                message: ERROR_CODES.INVALID_API_KEY,
              })
            }

            const hashed = opts.disableKeyHashing ? key : await defaultKeyHasher(key)

            const apiKeyData = await validateApiKey({
              hashedKey: hashed,
              ctx: ctx as never,
              opts,
            })

            const user = await (ctx.context as unknown as {
              internalAdapter: {
                findUserById: (id: string) => Promise<{ id: string; email?: string; name?: string } | null>
              }
            }).internalAdapter.findUserById(apiKeyData.userId)

            if (!user) {
              throw new APIError("UNAUTHORIZED", {
                message: ERROR_CODES.INVALID_USER_ID_FROM_API_KEY,
              })
            }

            const session = {
              user,
              session: {
                id: apiKeyData.id,
                token: key,
                userId: apiKeyData.userId,
                userAgent: ctx.request?.headers.get("user-agent") ?? null,
                ipAddress: ctx.request ? getIp(ctx.request) : null,
                createdAt: new Date(),
                updatedAt: new Date(),
                expiresAt:
                  apiKeyData.expiresAt ||
                  getDate(
                    (ctx.context as unknown as { options?: { session?: { expiresIn?: number } } }).options?.session?.expiresIn || 60 * 60 * 24 * 7
                  ),
              },
            }

            ;(ctx.context as unknown as { session: typeof session }).session = session

            if (ctx.path === "/get-session") {
              return session
            } else {
              return { context: ctx }
            }
          }),
        },
      ],
    },
    endpoints: {
      createApiKey: routes.createApiKey,
      verifyApiKey: routes.verifyApiKey,
      getApiKey: routes.getApiKey,
      updateApiKey: routes.updateApiKey,
      deleteApiKey: routes.deleteApiKey,
      listApiKeys: routes.listApiKeys,
    },
    schema,
  } satisfies BetterAuthPlugin
}

export type { ApiKey, ApiKeyOptions } from "./types"
