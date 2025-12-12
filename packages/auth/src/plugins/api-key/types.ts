export type ApiKeyOptions = {
  signingSecret?: string
  storage?: "database" | "secondary-storage"
  fallbackToDatabase?: boolean
  customStorage?: {
    get: (key: string) => Promise<unknown> | unknown
    set: (key: string, value: string, ttl?: number) => Promise<void | null | unknown> | void
    delete: (key: string) => Promise<void | null | string> | void
  }
}

export type ApiKey = {
  id: string
  name: string
  start: string
  key: string
  userId: string
  organizationId: string | null
  environment: string
  enabled: boolean
  expiresAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export type ResolvedApiKeyOptions = {
  signingSecret?: string
  storage: "database" | "secondary-storage"
  fallbackToDatabase: boolean
  customStorage?: ApiKeyOptions["customStorage"]
}
