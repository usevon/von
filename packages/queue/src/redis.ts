import { getRedisClient } from "@/connection";

const redis = () => getRedisClient();

/**
 * Set a key only if it doesn't exist (NX), with expiry.
 * Returns true if the key was set (first caller wins).
 */
export async function setnx(
  key: string,
  ttl: number
): Promise<boolean> {
  const result = await redis().set(key, "1", "EX", ttl, "NX");
  return result === "OK";
}

/**
 * Get a cached JSON value. Returns null on miss or parse error (auto-cleans bad entries).
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  const raw = await redis().get(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    await redis().del(key);
    return null;
  }
}

/**
 * Set a cached JSON value with TTL.
 */
export async function cacheSet(
  key: string,
  value: unknown,
  ttl: number
): Promise<void> {
  await redis().setex(key, ttl, JSON.stringify(value));
}

/**
 * Delete a cached key.
 */
export async function cacheDel(key: string): Promise<void> {
  await redis().del(key);
}
