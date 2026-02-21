import type { ApiKey, ResolvedApiKeyOptions } from "@/plugins/api-key/types";

export type SecondaryStorage = {
  get: (key: string) => Promise<string | null> | string | null;
  set: (key: string, value: string, ttl?: number) => Promise<void> | void;
  delete: (key: string) => Promise<void> | void;
};

export type GenericEndpointContext = {
  context: {
    adapter: {
      findOne: <T>(options: {
        model: string;
        where: Array<{ field: string; value: unknown }>;
      }) => Promise<T | null>;
      delete: (options: {
        model: string;
        where: Array<{ field: string; value: unknown }>;
      }) => Promise<void>;
    };
    logger: {
      error: (message: string, ...args: unknown[]) => void;
    };
    secondaryStorage?: SecondaryStorage | null;
  };
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
  return ctx.context.secondaryStorage ?? null;
}

function calculateTTL(apiKey: ApiKey): number | undefined {
  if (!apiKey.expiresAt) {
    return;
  }
  const ttlSeconds = Math.floor(
    (new Date(apiKey.expiresAt).getTime() - Date.now()) / 1000
  );
  return ttlSeconds > 0 ? ttlSeconds : 1;
}

async function getApiKeyFromStorage(
  hashedKey: string,
  storage: SecondaryStorage
): Promise<ApiKey | null> {
  return deserializeApiKey(
    await storage.get(getStorageKeyByHashedKey(hashedKey))
  );
}

async function getApiKeyByIdFromStorage(
  id: string,
  storage: SecondaryStorage
): Promise<ApiKey | null> {
  return deserializeApiKey(await storage.get(getStorageKeyById(id)));
}

async function setApiKeyInStorage(
  apiKey: ApiKey,
  storage: SecondaryStorage,
  ttl?: number
): Promise<void> {
  const serialized = serializeApiKey(apiKey);
  await storage.set(getStorageKeyByHashedKey(apiKey.key), serialized, ttl);
  await storage.set(getStorageKeyById(apiKey.id), serialized, ttl);
}

async function removeApiKeyFromStorage(
  apiKey: ApiKey,
  storage: SecondaryStorage
): Promise<void> {
  await storage.delete(getStorageKeyByHashedKey(apiKey.key));
  await storage.delete(getStorageKeyById(apiKey.id));
}

export async function getApiKey(
  ctx: GenericEndpointContext,
  hashedKey: string,
  opts: ResolvedApiKeyOptions
): Promise<ApiKey | null> {
  if (opts.storage === "database") {
    return ctx.context.adapter.findOne<ApiKey>({
      model: API_KEY_TABLE_NAME,
      where: [{ field: "key", value: hashedKey }],
    });
  }

  const storage = getStorageInstance(ctx, opts);

  if (opts.fallbackToDatabase) {
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
      await setApiKeyInStorage(dbKey, storage, calculateTTL(dbKey));
    }
    return dbKey;
  }

  if (!storage) {
    return null;
  }
  return getApiKeyFromStorage(hashedKey, storage);
}

export async function getApiKeyById(
  ctx: GenericEndpointContext,
  id: string,
  opts: ResolvedApiKeyOptions
): Promise<ApiKey | null> {
  if (opts.storage === "database") {
    return ctx.context.adapter.findOne<ApiKey>({
      model: API_KEY_TABLE_NAME,
      where: [{ field: "id", value: id }],
    });
  }

  const storage = getStorageInstance(ctx, opts);

  if (opts.fallbackToDatabase) {
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
      await setApiKeyInStorage(dbKey, storage, calculateTTL(dbKey));
    }
    return dbKey;
  }

  if (!storage) {
    return null;
  }
  return getApiKeyByIdFromStorage(id, storage);
}

export async function setApiKey(
  ctx: GenericEndpointContext,
  apiKey: ApiKey,
  opts: ResolvedApiKeyOptions
): Promise<void> {
  if (opts.storage !== "secondary-storage") {
    return;
  }
  const storage = getStorageInstance(ctx, opts);
  if (!storage) {
    return;
  }
  await setApiKeyInStorage(apiKey, storage, calculateTTL(apiKey));
}

export async function deleteApiKeyFromSecondaryStorage(
  ctx: GenericEndpointContext,
  apiKey: ApiKey,
  opts: ResolvedApiKeyOptions
): Promise<void> {
  if (opts.storage !== "secondary-storage") {
    return;
  }
  const storage = getStorageInstance(ctx, opts);
  if (!storage) {
    return;
  }
  await removeApiKeyFromStorage(apiKey, storage);
}
