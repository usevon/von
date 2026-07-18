type RedisLike = {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string) => Promise<unknown>;
  setex: (key: string, ttl: number, value: string) => Promise<unknown>;
  del: (key: string) => Promise<unknown>;
};

export const createSecondaryStorage = (redis: RedisLike) => ({
  get: async (key: string) => await redis.get(key),
  set: async (key: string, value: string, ttl?: number) => {
    if (ttl) {
      await redis.setex(key, ttl, value);
      return;
    }

    await redis.set(key, value);
  },
  delete: async (key: string) => {
    await redis.del(key);
  },
});

export type SecondaryStorageAdapter = ReturnType<typeof createSecondaryStorage>;
