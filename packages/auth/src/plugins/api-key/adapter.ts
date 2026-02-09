import type { ApiKey, ResolvedApiKeyOptions } from "@/plugins/api-key/types";

export type SecondaryStorage = {
  get: (key: string) => Promise<string | null> | string | null;
  set: (key: string, value: string, ttl?: number) => Promise<void> | void;
  delete: (key: string) => Promise<void> | void;
};

type AuthContext = {
  adapter: {
    findOne: <T>(options: {
      model: string;
      where: Array<{ field: string; value: unknown }>;
    }) => Promise<T | null>;
  };
  secondaryStorage?: SecondaryStorage | null;
};

type GenericEndpointContext = {
  context: AuthContext;
};

const API_KEY_TABLE_NAME = "apikey";

function getStorageKeyByHashedKey(hashedKey: string): string {
  return `api-key:${hashedKey}`;
}

function getStorageKeyById(id: string): string {
  return `api-key:by-id:${id}`;
}

function serializeApiKey(apiKey: ApiKey): string {
  return JSON.stringify({
    ...apiKey,
    createdAt: apiKey.createdAt.toISOString(),
    updatedAt: apiKey.updatedAt.toISOString(),
    expiresAt: apiKey.expiresAt?.toISOString() ?? null,
    lastUsedAt: apiKey.lastUsedAt?.toISOString() ?? null,
  });
}

function deserializeApiKey(data: unknown): ApiKey | null {
  if (!data || typeof data !== "string") {
    return null;
  }

  try {
    const parsed = JSON.parse(data);
    return {
      ...parsed,
      createdAt: new Date(parsed.createdAt),
      updatedAt: new Date(parsed.updatedAt),
      expiresAt: parsed.expiresAt ? new Date(parsed.expiresAt) : null,
      lastUsedAt: parsed.lastUsedAt ? new Date(parsed.lastUsedAt) : null,
    } as ApiKey;
  } catch {
    return null;
  }
}

function getStorageInstance(
  ctx: GenericEndpointContext,
  opts: ResolvedApiKeyOptions
): SecondaryStorage | null {
  if (opts.secondaryStorage) {
    return opts.secondaryStorage as SecondaryStorage;
  }
  return ctx.context.secondaryStorage || null;
}

function calculateTTL(apiKey: ApiKey): number | undefined {
  if (apiKey.expiresAt) {
    const now = Date.now();
    const expiresAt = new Date(apiKey.expiresAt).getTime();
    const ttlSeconds = Math.floor((expiresAt - now) / 1000);
    if (ttlSeconds > 0) {
      return ttlSeconds;
    }
    // Key is already expired - return 1 second TTL to allow cache entry
    // but ensure it expires quickly rather than being cached indefinitely
    return 1;
  }
  return;
}

async function getApiKeyFromStorage(
  hashedKey: string,
  storage: SecondaryStorage
): Promise<ApiKey | null> {
  const key = getStorageKeyByHashedKey(hashedKey);
  const data = await storage.get(key);
  return deserializeApiKey(data);
}

async function getApiKeyByIdFromStorage(
  id: string,
  storage: SecondaryStorage
): Promise<ApiKey | null> {
  const key = getStorageKeyById(id);
  const data = await storage.get(key);
  return deserializeApiKey(data);
}

async function setApiKeyInStorage(
  apiKey: ApiKey,
  storage: SecondaryStorage,
  ttl?: number
): Promise<void> {
  const serialized = serializeApiKey(apiKey);
  const hashedKey = apiKey.key;
  const id = apiKey.id;

  await storage.set(getStorageKeyByHashedKey(hashedKey), serialized, ttl);
  await storage.set(getStorageKeyById(id), serialized, ttl);
}

async function deleteApiKeyFromStorage(
  apiKey: ApiKey,
  storage: SecondaryStorage
): Promise<void> {
  const hashedKey = apiKey.key;
  const id = apiKey.id;

  await storage.delete(getStorageKeyByHashedKey(hashedKey));
  await storage.delete(getStorageKeyById(id));
}

export async function getApiKey(
  ctx: GenericEndpointContext,
  hashedKey: string,
  opts: ResolvedApiKeyOptions
): Promise<ApiKey | null> {
  const storage = getStorageInstance(ctx, opts);

  if (opts.storage === "database") {
    return await ctx.context.adapter.findOne<ApiKey>({
      model: API_KEY_TABLE_NAME,
      where: [{ field: "key", value: hashedKey }],
    });
  }

  if (opts.storage === "secondary-storage" && opts.fallbackToDatabase) {
    if (storage) {
      const cached = await getApiKeyFromStorage(hashedKey, storage);
      if (cached) {
        return cached;
      }
    }

    const dbKey = await ctx.context.adapter.findOne<ApiKey>({
      model: API_KEY_TABLE_NAME,
      where: [{ field: "key", value: hashedKey }],
    });

    if (dbKey && storage) {
      const ttl = calculateTTL(dbKey);
      await setApiKeyInStorage(dbKey, storage, ttl);
    }

    return dbKey;
  }

  if (opts.storage === "secondary-storage") {
    if (!storage) {
      return null;
    }
    return await getApiKeyFromStorage(hashedKey, storage);
  }

  return await ctx.context.adapter.findOne<ApiKey>({
    model: API_KEY_TABLE_NAME,
    where: [{ field: "key", value: hashedKey }],
  });
}

export async function getApiKeyById(
  ctx: GenericEndpointContext,
  id: string,
  opts: ResolvedApiKeyOptions
): Promise<ApiKey | null> {
  const storage = getStorageInstance(ctx, opts);

  if (opts.storage === "database") {
    return await ctx.context.adapter.findOne<ApiKey>({
      model: API_KEY_TABLE_NAME,
      where: [{ field: "id", value: id }],
    });
  }

  if (opts.storage === "secondary-storage" && opts.fallbackToDatabase) {
    if (storage) {
      const cached = await getApiKeyByIdFromStorage(id, storage);
      if (cached) {
        return cached;
      }
    }

    const dbKey = await ctx.context.adapter.findOne<ApiKey>({
      model: API_KEY_TABLE_NAME,
      where: [{ field: "id", value: id }],
    });

    if (dbKey && storage) {
      const ttl = calculateTTL(dbKey);
      await setApiKeyInStorage(dbKey, storage, ttl);
    }

    return dbKey;
  }

  if (opts.storage === "secondary-storage") {
    if (!storage) {
      return null;
    }
    return await getApiKeyByIdFromStorage(id, storage);
  }

  return await ctx.context.adapter.findOne<ApiKey>({
    model: API_KEY_TABLE_NAME,
    where: [{ field: "id", value: id }],
  });
}

export async function setApiKey(
  ctx: GenericEndpointContext,
  apiKey: ApiKey,
  opts: ResolvedApiKeyOptions
): Promise<void> {
  const storage = getStorageInstance(ctx, opts);

  if (opts.storage === "secondary-storage" && storage) {
    const ttl = calculateTTL(apiKey);
    await setApiKeyInStorage(apiKey, storage, ttl);
  }
}

export async function deleteApiKey(
  ctx: GenericEndpointContext,
  apiKey: ApiKey,
  opts: ResolvedApiKeyOptions
): Promise<void> {
  const storage = getStorageInstance(ctx, opts);

  if (opts.storage === "secondary-storage" && storage) {
    await deleteApiKeyFromStorage(apiKey, storage);
  }
}
