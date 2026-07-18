const FLUSH_INTERVAL_MS = 300_000;

const globalFlush = globalThis as typeof globalThis & {
  __vonApiKeyFlushStarted?: boolean;
};

export const register = async () => {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  if (globalFlush.__vonApiKeyFlushStarted) {
    return;
  }
  globalFlush.__vonApiKeyFlushStarted = true;

  const { db, eq } = await import("@usevon/db");
  const { apikey } = await import("@usevon/db/schema");
  const { getRedisClient } = await import("@usevon/queue");
  const { log } = await import("@/lib/logger");

  const flushLastUsed = async () => {
    const redis = getRedisClient();
    const dirtyIds = await redis.spop("api:lastUsed:dirty", 100);
    if (!dirtyIds || dirtyIds.length === 0) {
      return;
    }

    const pipeline = redis.pipeline();
    for (const keyId of dirtyIds) {
      pipeline.get(`api:lastUsed:${keyId}`);
    }
    const results = await pipeline.exec();

    const updates: { id: string; lastUsedAt: Date }[] = [];
    for (let i = 0; i < dirtyIds.length; i++) {
      const ts = results?.[i]?.[1] as string | null;
      if (!ts) {
        continue;
      }
      updates.push({
        id: dirtyIds[i],
        lastUsedAt: new Date(Number(ts) * 1000),
      });
    }

    if (updates.length === 0) {
      return;
    }

    try {
      await db.transaction(async (tx) => {
        for (const { id, lastUsedAt } of updates) {
          await tx.update(apikey).set({ lastUsedAt }).where(eq(apikey.id, id));
        }
      });
    } catch (err) {
      log.error({ err }, "Failed to flush lastUsedAt batch");
    }
  };

  setInterval(flushLastUsed, FLUSH_INTERVAL_MS);
};
