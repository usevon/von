import IORedis from "ioredis";
import { env } from "@/env";

export type ConnectionOptions = {
  url?: string;
  maxRetriesPerRequest?: number | null;
};

function getUrl(options: ConnectionOptions = {}) {
  return options.url ?? env.REDIS_URL ?? "redis://localhost:6379";
}

export async function checkRedisConnection(
  options: ConnectionOptions = {}
): Promise<{ ok: boolean; url: string }> {
  const url = getUrl(options);
  const redis = new IORedis(url, {
    maxRetriesPerRequest: 1,
    retryStrategy: () => null,
    lazyConnect: true,
  });

  redis.on("error", () => {
    // Suppress connection errors during health check
  });

  try {
    await redis.connect();
    await redis.ping();
    await redis.quit();
    return { ok: true, url };
  } catch {
    await redis.quit().catch(() => {
      // Ignore quit errors during cleanup
    });
    return { ok: false, url };
  }
}

export function createConnection(options: ConnectionOptions = {}) {
  return new IORedis(getUrl(options), {
    maxRetriesPerRequest: options.maxRetriesPerRequest ?? null,
  });
}

let sharedClient: IORedis | null = null;

export function getRedisClient(options: ConnectionOptions = {}): IORedis {
  if (!sharedClient) {
    sharedClient = new IORedis(getUrl(options), {
      maxRetriesPerRequest: options.maxRetriesPerRequest ?? null,
      enableReadyCheck: true,
      lazyConnect: false,
      // Coalesces same-tick commands into one round trip on this shared connection.
      enableAutoPipelining: true,
    });
    sharedClient.on("error", () => {
      // Handled elsewhere - prevent unhandled rejection
    });
  }
  return sharedClient;
}

export async function closeRedis(): Promise<void> {
  if (sharedClient) {
    await sharedClient.quit();
    sharedClient = null;
  }
}
