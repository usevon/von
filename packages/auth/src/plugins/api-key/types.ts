import type { apiKeySchema } from "./schema"

export type ApiKeyOptions = {
  /**
   * The header name to check for API key
   * @default "x-api-key"
   */
  apiKeyHeaders?: string | string[]
  /**
   * Disable hashing of the API key.
   * Security Warning: It's strongly recommended to not disable hashing.
   * @default false
   */
  disableKeyHashing?: boolean
  /**
   * Custom key generation function
   */
  customKeyGenerator?: (options: {
    length: number
    prefix: string | undefined
    environment?: string
  }) => string | Promise<string>
  /**
   * The length of starting characters to store for display (includes prefix).
   * @default 12 (von_dev_ + 4 chars)
   */
  startingCharactersLength?: number
  /**
   * The length of the API key (excluding prefix).
   * @default 64
   */
  defaultKeyLength?: number
  /**
   * Whether to require a name for the API key.
   * @default false
   */
  requireName?: boolean
  /**
   * The maximum length of the name.
   * @default 64
   */
  maximumNameLength?: number
  /**
   * Customize the key expiration.
   */
  keyExpiration?: {
    /**
     * The default expires time in seconds. Null = no expiration.
     * @default null
     */
    defaultExpiresIn?: number | null
    /**
     * The maximum expiresIn value allowed (in days).
     * @default 365
     */
    maxExpiresIn?: number
  }
  /**
   * Default rate limit per second for new keys (can be overridden per-key or by plan)
   * @default 10
   */
  defaultRateLimitPerSecond?: number
  /**
   * Default burst multiplier as percentage (e.g., 150 = 1.5x burst capacity)
   * @default 100 (no burst)
   */
  defaultBurstMultiplier?: number
  /**
   * An API Key can represent a valid session.
   * @default false
   */
  enableSessionForAPIKeys?: boolean
  /**
   * Default environment for new API keys
   * @default "dev"
   */
  defaultEnvironment?: "dev" | "staging" | "prod"
}

export type ApiKey = {
  id: string
  name: string | null
  start: string | null // First N chars for display (e.g., "von_dev_AbCd")
  key: string // Hashed key
  userId: string
  organizationId: string | null
  // Von-specific fields
  environment: string | null // dev | staging | prod
  enabled: boolean
  expiresAt: Date | null
  // Analytics
  requestCount: number
  lastRequest: Date | null
  // Timestamps
  createdAt: Date
  updatedAt: Date
}

export type PredefinedApiKeyOptions = Required<
  Pick<
    ApiKeyOptions,
    | "apiKeyHeaders"
    | "defaultKeyLength"
    | "disableKeyHashing"
    | "requireName"
    | "maximumNameLength"
    | "startingCharactersLength"
    | "enableSessionForAPIKeys"
    | "defaultEnvironment"
  >
> & {
  keyExpiration: Required<NonNullable<ApiKeyOptions["keyExpiration"]>>
  customKeyGenerator?: ApiKeyOptions["customKeyGenerator"]
}
