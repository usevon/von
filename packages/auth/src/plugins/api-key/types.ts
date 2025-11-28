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
   * An API Key can represent a valid session.
   * @default false
   */
  enableSessionForAPIKeys?: boolean
  /**
   * Default environment for new API keys
   * @default "dev"
   */
  defaultEnvironment?: "dev" | "staging" | "prod"
  /**
   * Storage backend for API keys.
   * - "database": Store API keys in the database adapter only (default)
   * - "secondary-storage": Use Redis/secondary storage for faster lookups
   * @default "database"
   */
  storage?: "database" | "secondary-storage"
  /**
   * When storage is "secondary-storage", enable fallback to database
   * if key is not found in secondary storage.
   * Useful for gradual migration from database to secondary storage.
   * @default false
   */
  fallbackToDatabase?: boolean
  /**
   * Custom storage methods for API keys.
   * If provided, these methods will be used instead of ctx.context.secondaryStorage.
   * Useful when you want to use a different storage backend specifically for API keys.
   */
  customStorage?: {
    get: (key: string) => Promise<unknown> | unknown
    set: (key: string, value: string, ttl?: number) => Promise<void | null | unknown> | void
    delete: (key: string) => Promise<void | null | string> | void
  }
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
    | "storage"
    | "fallbackToDatabase"
  >
> & {
  keyExpiration: Required<NonNullable<ApiKeyOptions["keyExpiration"]>>
  customKeyGenerator?: ApiKeyOptions["customKeyGenerator"]
  customStorage?: ApiKeyOptions["customStorage"]
}
