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

import { setnx, cacheGet, cacheSet, cacheDel } from "../src/redis";

afterEach(() => {
  store.clear();
  nxKeys.clear();
});

describe("setnx", () => {
  test("returns true on first call", async () => {
    expect(await setnx("key1", 60)).toBe(true);
  });

  test("returns false on second call with same key", async () => {
    await setnx("key2", 60);
    expect(await setnx("key2", 60)).toBe(false);
  });
});

describe("cacheGet", () => {
  test("returns null on miss", async () => {
    expect(await cacheGet("missing")).toBeNull();
  });

  test("returns parsed JSON on hit", async () => {
    store.set("json-key", JSON.stringify({ id: 1, name: "test" }));
    const result = await cacheGet<{ id: number; name: string }>("json-key");
    expect(result).toEqual({ id: 1, name: "test" });
  });

  test("returns null and cleans up invalid JSON", async () => {
    store.set("bad-json", "not{valid}json");
    const result = await cacheGet("bad-json");
    expect(result).toBeNull();
    expect(store.has("bad-json")).toBe(false);
  });
});

describe("cacheSet", () => {
  test("stores JSON string", async () => {
    await cacheSet("write-key", { foo: "bar" }, 300);
    expect(store.get("write-key")).toBe('{"foo":"bar"}');
  });
});

describe("cacheDel", () => {
  test("removes a key", async () => {
    store.set("del-key", "value");
    await cacheDel("del-key");
    expect(store.has("del-key")).toBe(false);
  });

  test("does not throw for missing key", async () => {
    await cacheDel("nonexistent");
  });
});
