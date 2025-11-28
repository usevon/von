import type { ApiKey, PredefinedApiKeyOptions } from "./types"

/**
 * Secondary Storage interface (compatible with better-auth's SecondaryStorage)
 */
export type SecondaryStorage = {
  get: (key: string) => Promise<unknown> | unknown
  set: (key: string, value: string, ttl?: number) => Promise<void | null | unknown> | void
  delete: (key: string) => Promise<void | null | string> | void
}

type AuthContext = {
  adapter: {
    findOne: <T>(options: {
      model: string
      where: Array<{ field: string; value: unknown }>
    }) => Promise<T | null>
  }
  secondaryStorage?: SecondaryStorage | null
}

type GenericEndpointContext = {
  context: AuthContext
}

const API_KEY_TABLE_NAME = "apikey"

/**
 * Generate storage key for API key by hashed key
 */
function getStorageKeyByHashedKey(hashedKey: string): string {
  return `api-key:${hashedKey}`
}

/**
 * Generate storage key for API key by ID
 */
function getStorageKeyById(id: string): string {
  return `api-key:by-id:${id}`
}

/**
 * Serialize API key for storage
 */
function serializeApiKey(apiKey: ApiKey): string {
  return JSON.stringify({
    ...apiKey,
    createdAt: apiKey.createdAt.toISOString(),
    updatedAt: apiKey.updatedAt.toISOString(),
    expiresAt: apiKey.expiresAt?.toISOString() ?? null,
    lastRequest: apiKey.lastRequest?.toISOString() ?? null,
  })
}

/**
 * Deserialize API key from storage
 */
function deserializeApiKey(data: unknown): ApiKey | null {
  if (!data || typeof data !== "string") {
    return null
  }

  try {
    const parsed = JSON.parse(data)
    return {
      ...parsed,
      createdAt: new Date(parsed.createdAt),
      updatedAt: new Date(parsed.updatedAt),
      expiresAt: parsed.expiresAt ? new Date(parsed.expiresAt) : null,
      lastRequest: parsed.lastRequest ? new Date(parsed.lastRequest) : null,
    } as ApiKey
  } catch {
    return null
  }
}

/**
 * Get the storage instance to use (custom methods take precedence)
 */
function getStorageInstance(
  ctx: GenericEndpointContext,
  opts: PredefinedApiKeyOptions
): SecondaryStorage | null {
  if (opts.customStorage) {
    return opts.customStorage as SecondaryStorage
  }
  return ctx.context.secondaryStorage || null
}

/**
 * Calculate TTL in seconds for an API key
 */
function calculateTTL(apiKey: ApiKey): number | undefined {
  if (apiKey.expiresAt) {
    const now = Date.now()
    const expiresAt = new Date(apiKey.expiresAt).getTime()
    const ttlSeconds = Math.floor((expiresAt - now) / 1000)
    if (ttlSeconds > 0) {
      return ttlSeconds
    }
  }
  return undefined
}

/**
 * Get API key from secondary storage by hashed key
 */
async function getApiKeyFromStorage(
  hashedKey: string,
  storage: SecondaryStorage
): Promise<ApiKey | null> {
  const key = getStorageKeyByHashedKey(hashedKey)
  const data = await storage.get(key)
  return deserializeApiKey(data)
}

/**
 * Get API key from secondary storage by ID
 */
async function getApiKeyByIdFromStorage(
  id: string,
  storage: SecondaryStorage
): Promise<ApiKey | null> {
  const key = getStorageKeyById(id)
  const data = await storage.get(key)
  return deserializeApiKey(data)
}

/**
 * Store API key in secondary storage
 */
async function setApiKeyInStorage(
  apiKey: ApiKey,
  storage: SecondaryStorage,
  ttl?: number
): Promise<void> {
  const serialized = serializeApiKey(apiKey)
  const hashedKey = apiKey.key
  const id = apiKey.id

  // Store by hashed key (primary lookup for verification)
  await storage.set(getStorageKeyByHashedKey(hashedKey), serialized, ttl)

  // Store by ID (for ID-based lookups like get/update/delete)
  await storage.set(getStorageKeyById(id), serialized, ttl)
}

/**
 * Delete API key from secondary storage
 */
async function deleteApiKeyFromStorage(
  apiKey: ApiKey,
  storage: SecondaryStorage
): Promise<void> {
  const hashedKey = apiKey.key
  const id = apiKey.id

  await storage.delete(getStorageKeyByHashedKey(hashedKey))
  await storage.delete(getStorageKeyById(id))
}

/**
 * Get API key with support for all storage modes
 */
export async function getApiKey(
  ctx: GenericEndpointContext,
  hashedKey: string,
  opts: PredefinedApiKeyOptions
): Promise<ApiKey | null> {
  const storage = getStorageInstance(ctx, opts)

  // Database mode only
  if (opts.storage === "database") {
    return await ctx.context.adapter.findOne<ApiKey>({
      model: API_KEY_TABLE_NAME,
      where: [{ field: "key", value: hashedKey }],
    })
  }

  // Secondary storage mode with fallback
  if (opts.storage === "secondary-storage" && opts.fallbackToDatabase) {
    if (storage) {
      const cached = await getApiKeyFromStorage(hashedKey, storage)
      if (cached) {
        return cached
      }
    }

    const dbKey = await ctx.context.adapter.findOne<ApiKey>({
      model: API_KEY_TABLE_NAME,
      where: [{ field: "key", value: hashedKey }],
    })

    if (dbKey && storage) {
      // Populate secondary storage for future reads
      const ttl = calculateTTL(dbKey)
      await setApiKeyInStorage(dbKey, storage, ttl)
    }

    return dbKey
  }

  // Secondary storage mode only
  if (opts.storage === "secondary-storage") {
    if (!storage) {
      return null
    }
    return await getApiKeyFromStorage(hashedKey, storage)
  }

  // Default fallback to database
  return await ctx.context.adapter.findOne<ApiKey>({
    model: API_KEY_TABLE_NAME,
    where: [{ field: "key", value: hashedKey }],
  })
}

/**
 * Get API key by ID with support for all storage modes
 */
export async function getApiKeyById(
  ctx: GenericEndpointContext,
  id: string,
  opts: PredefinedApiKeyOptions
): Promise<ApiKey | null> {
  const storage = getStorageInstance(ctx, opts)

  // Database mode only
  if (opts.storage === "database") {
    return await ctx.context.adapter.findOne<ApiKey>({
      model: API_KEY_TABLE_NAME,
      where: [{ field: "id", value: id }],
    })
  }

  // Secondary storage mode with fallback
  if (opts.storage === "secondary-storage" && opts.fallbackToDatabase) {
    if (storage) {
      const cached = await getApiKeyByIdFromStorage(id, storage)
      if (cached) {
        return cached
      }
    }

    const dbKey = await ctx.context.adapter.findOne<ApiKey>({
      model: API_KEY_TABLE_NAME,
      where: [{ field: "id", value: id }],
    })

    if (dbKey && storage) {
      const ttl = calculateTTL(dbKey)
      await setApiKeyInStorage(dbKey, storage, ttl)
    }

    return dbKey
  }

  // Secondary storage mode only
  if (opts.storage === "secondary-storage") {
    if (!storage) {
      return null
    }
    return await getApiKeyByIdFromStorage(id, storage)
  }

  // Default fallback
  return await ctx.context.adapter.findOne<ApiKey>({
    model: API_KEY_TABLE_NAME,
    where: [{ field: "id", value: id }],
  })
}

/**
 * Store API key in secondary storage (called after DB insert)
 */
export async function setApiKey(
  ctx: GenericEndpointContext,
  apiKey: ApiKey,
  opts: PredefinedApiKeyOptions
): Promise<void> {
  const storage = getStorageInstance(ctx, opts)

  // Only sync to secondary storage if configured
  if (opts.storage === "secondary-storage" && storage) {
    const ttl = calculateTTL(apiKey)
    await setApiKeyInStorage(apiKey, storage, ttl)
  }
}

/**
 * Delete API key from secondary storage (called after DB delete)
 */
export async function deleteApiKey(
  ctx: GenericEndpointContext,
  apiKey: ApiKey,
  opts: PredefinedApiKeyOptions
): Promise<void> {
  const storage = getStorageInstance(ctx, opts)

  // Only delete from secondary storage if configured
  if (opts.storage === "secondary-storage" && storage) {
    await deleteApiKeyFromStorage(apiKey, storage)
  }
}
