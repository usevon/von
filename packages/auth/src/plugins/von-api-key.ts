/**
 * Von API Key Plugin
 *
 * Extension of better-auth's api-key plugin with Von-specific fields.
 * Based on: https://github.com/better-auth/better-auth/tree/canary/packages/better-auth/src/plugins/api-key
 *
 * Von additions:
 * - environment: Separate keys for dev/staging/prod
 * - organizationId: Scope keys to organizations
 * - burstLimit: Allow temporary burst above rate limit
 */
import { apiKey } from "better-auth/plugins"
import type { ApiKeyOptions } from "better-auth/plugins"

export type VonApiKeyOptions = ApiKeyOptions & {
  defaultEnvironment?: "dev" | "staging" | "prod"
}

export const vonApiKey = (options?: VonApiKeyOptions) => {
  const plugin = apiKey({
    ...options,
    defaultPrefix: options?.defaultPrefix ?? "von_",
    enableSessionForAPIKeys: true,
    schema: {
      apikey: {
        fields: {
          environment: {
            type: "string",
            required: false,
            defaultValue: options?.defaultEnvironment ?? "dev",
          },
          organizationId: {
            type: "string",
            required: false,
          },
          burstLimit: {
            type: "number",
            required: false,
          },
        },
      },
    },
  })

  return {
    ...plugin,
    id: "von-api-key",
  }
}

export type VonApiKey = {
  id: string
  name: string | null
  start: string | null
  prefix: string | null
  key: string
  userId: string
  environment: "dev" | "staging" | "prod"
  organizationId: string | null
  burstLimit: number | null
  enabled: boolean
  rateLimitEnabled: boolean
  rateLimitTimeWindow: number | null
  rateLimitMax: number | null
  requestCount: number
  expiresAt: Date | null
  createdAt: Date
  updatedAt: Date
}
