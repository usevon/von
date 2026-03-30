import { db, eq } from "@usevon/db";
import { apikey } from "@usevon/db/schema";
import { getRedisClient } from "@usevon/queue";
import { log } from "@/lib/logger";

async function flushLastUsed() {
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
    if (!ts) { continue; }
    updates.push({
      id: dirtyIds[i],
      lastUsedAt: new Date(Number(ts) * 1000),
    });
  }

  if (updates.length === 0) { return; }

  try {
    await db.transaction(async (tx) => {
      for (const { id, lastUsedAt } of updates) {
        await tx
          .update(apikey)
          .set({ lastUsedAt })
          .where(eq(apikey.id, id));
      }
    });
  } catch (err) {
    log.error({ err }, "Failed to flush lastUsedAt batch");
  }
}

setInterval(flushLastUsed, 300_000);
