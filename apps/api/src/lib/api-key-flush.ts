import { db, eq } from "@usevon/db";
import { apikey } from "@usevon/db/schema";
import { getRedisClient } from "@usevon/queue";
import { createLogger } from "@usevon/utils/logger";

const log = createLogger({ name: "api-key-flush" });

async function flushLastUsed() {
  const redis = getRedisClient();
  const dirtyIds = await redis.smembers("api:lastUsed:dirty");
  if (dirtyIds.length === 0) {
    return;
  }

  await redis.del("api:lastUsed:dirty");

  for (const keyId of dirtyIds) {
    const ts = await redis.get(`api:lastUsed:${keyId}`);
    if (!ts) {
      continue;
    }
    try {
      await db
        .update(apikey)
        .set({ lastUsedAt: new Date(Number(ts) * 1000) })
        .where(eq(apikey.id, keyId));
    } catch (err) {
      log.error(`Failed to flush lastUsedAt for key ${keyId}`, err);
    }
  }
}

setInterval(flushLastUsed, 60_000);
