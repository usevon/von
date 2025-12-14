import { createAuthEndpoint, APIError, getSessionFromCtx } from "better-auth/api"
import { z } from "zod"
import type { ApiKey, ResolvedApiKeyOptions } from "@/plugins/api-key/types"
import { setApiKey } from "@/plugins/api-key/adapter"
import { hashKey } from "@/plugins/api-key/crypto"
import { ERROR_CODES } from "@/plugins/api-key"

const API_KEY_TABLE_NAME = "apikey"

export function createApiKey({
  keyGenerator,
  opts,
  startLength,
  maxNameLength,
  maxExpiresDays,
}: {
  keyGenerator: (environment: string) => Promise<string>
  opts: ResolvedApiKeyOptions
  startLength: number
  maxNameLength: number
  maxExpiresDays: number
}) {
  return createAuthEndpoint(
    "/api-key/create",
    {
      method: "POST",
      body: z.object({
        name: z.string().min(1).max(maxNameLength),
        expiresIn: z.number().min(1).optional(),
        environment: z.enum(["dev", "staging", "prod"]),
        organizationId: z.string().optional(),
      }),
    },
    async (ctx) => {
      const { name, expiresIn, environment, organizationId } = ctx.body

      const session = await getSessionFromCtx(ctx)
      if (!session) {
        throw new APIError("UNAUTHORIZED", {
          message: ERROR_CODES.UNAUTHORIZED_SESSION,
        })
      }

      if (expiresIn) {
        const expiresInDays = expiresIn / (60 * 60 * 24)
        if (expiresInDays > maxExpiresDays) {
          throw new APIError("BAD_REQUEST", {
            message: `Expiration cannot exceed ${maxExpiresDays} days`,
          })
        }
      }

      const key = await keyGenerator(environment)
      const hashed = hashKey(key)
      const start = key.substring(0, startLength)

      const data: Omit<ApiKey, "id"> = {
        name,
        start,
        key: hashed,
        userId: session.user.id,
        organizationId: organizationId ?? null,
        environment,
        enabled: true,
        expiresAt: expiresIn ? new Date(Date.now() + expiresIn * 1000) : null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const apiKey = await ctx.context.adapter.create<Omit<ApiKey, "id">, ApiKey>({
        model: API_KEY_TABLE_NAME,
        data,
      })

      await setApiKey(ctx as never, apiKey, opts)

      return ctx.json({
        ...apiKey,
        key,
      })
    }
  )
}
