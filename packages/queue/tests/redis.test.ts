import { afterEach, describe, expect, mock, test } from "bun:test";

const store = new Map<string, string>();
const nxKeys = new Set<string>();

const mockRedis = {
  get: (key: string) => Promise.resolve(store.get(key) ?? null),
  set: (...args: [string, string, ...unknown[]]) => {
    const [key, value] = args;
    const nx = args.find((a) => a === "NX");
    if (nx && nxKeys.has(key)) {
      return Promise.resolve(null);
    }
    store.set(key, value);
    nxKeys.add(key);
    return Promise.resolve("OK");
  },
  setex: (key: string, _ttl: number, value: string) => {
    store.set(key, value);
    return Promise.resolve("OK");
  },
  del: (key: string) => {
    const had = store.delete(key);
    return Promise.resolve(had ? 1 : 0);
  },
};

mock.module("@/connection", () => ({
  getRedisClient: () => mockRedis,
}));

import { cacheGet } from "../src/redis";

afterEach(() => {
  store.clear();
  nxKeys.clear();
});

describe("cacheGet", () => {
  test("returns null and cleans up invalid JSON", async () => {
    store.set("bad-json", "not{valid}json");
    const result = await cacheGet("bad-json");
    expect(result).toBeNull();
    expect(store.has("bad-json")).toBe(false);
  });
});
