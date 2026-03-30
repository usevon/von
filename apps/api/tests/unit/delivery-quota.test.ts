import { beforeEach, describe, expect, mock, test } from "bun:test";
import { TooManyRequestsError } from "@usevon/utils";

const stringStore = new Map<string, string>();
const setStore = new Map<string, Set<string>>();

const mockRedis = {
  eval: mock(() => Promise.resolve([1, 100] as unknown)),
  set: mock((key: string, value: string) => {
    stringStore.set(key, value);
    return Promise.resolve("OK");
  }),
  sadd: mock((key: string, value: string) => {
    const set = setStore.get(key) ?? new Set<string>();
    const exists = set.has(value);
    set.add(value);
    setStore.set(key, set);
    return Promise.resolve(exists ? 0 : 1);
  }),
  del: mock((key: string) => {
    const hadString = stringStore.delete(key);
    const hadSet = setStore.delete(key);
    return Promise.resolve(hadString || hadSet ? 1 : 0);
  }),
  srem: mock((key: string, value: string) => {
    const set = setStore.get(key);
    if (!set?.has(value)) {
      return Promise.resolve(0);
    }
    set.delete(value);
    if (set.size === 0) {
      setStore.delete(key);
    }
    return Promise.resolve(1);
  }),
  expire: mock(() => Promise.resolve(1)),
  scard: mock((key: string) => Promise.resolve(setStore.get(key)?.size ?? 0)),
  get: mock((key: string) => Promise.resolve(stringStore.get(key) ?? null)),
  publish: mock(() => Promise.resolve(1)),
};

const mockSubscriber = {
  subscribe: mock(() => Promise.resolve(1)),
  on: mock(() => mockSubscriber),
  unsubscribe: mock(() => Promise.resolve(1)),
  quit: mock(() => Promise.resolve("OK")),
};

mock.module("@usevon/queue", () => ({
  getRedisClient: () => mockRedis,
  createConnection: () => mockSubscriber,
  checkRedisConnection: () => Promise.resolve({ ok: true }),
  closeRedis: () => Promise.resolve(),
  getWebhookDeliveryQueue: () => ({
    addBulk: () => Promise.resolve([]),
    add: () => Promise.resolve({}),
  }),
  getInboundForwardingQueue: () => ({
    addBulk: () => Promise.resolve([]),
    add: () => Promise.resolve({}),
  }),
}));

import {
  getMonthKey,
  reserveMonthlyQuota,
  releaseMonthlyQuota,
  DELIVERY_TTL,
} from "@/lib/delivery-quota";

describe("getMonthKey", () => {
  test("returns correct format", () => {
    const key = getMonthKey("org-123");
    const now = new Date();
    const expectedMonth = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
    expect(key).toBe(`org:deliveries:org-123:${expectedMonth}`);
  });
});

describe("reserveMonthlyQuota", () => {
  beforeEach(() => {
    stringStore.clear();
    setStore.clear();
    mockRedis.eval.mockReset();
  });

  test("returns early for zero count without calling redis", async () => {
    const result = await reserveMonthlyQuota("org-1", "hobby", 0);
    expect(result).toEqual({ allowed: true, currentUsage: 0 });
    expect(mockRedis.eval).not.toHaveBeenCalled();
  });

  test("returns early for negative count without calling redis", async () => {
    const result = await reserveMonthlyQuota("org-1", "hobby", -1);
    expect(result).toEqual({ allowed: true, currentUsage: 0 });
    expect(mockRedis.eval).not.toHaveBeenCalled();
  });

  test("calls redis.eval with correct args for hobby plan", async () => {
    mockRedis.eval.mockResolvedValue([1, 500]);

    await reserveMonthlyQuota("org-1", "hobby", 5);

    const now = new Date();
    const expectedMonth = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
    const expectedKey = `org:deliveries:org-1:${expectedMonth}`;

    expect(mockRedis.eval).toHaveBeenCalledWith(
      expect.any(String),
      1,
      expectedKey,
      "25000", // hobby monthlyDeliveries
      "5",
      String(DELIVERY_TTL),
      "0" // hobby hasOverage = false
    );
  });

  test("calls redis.eval with hasOverage=1 for metered plan", async () => {
    mockRedis.eval.mockResolvedValue([1, 500]);

    await reserveMonthlyQuota("org-1", "metered", 10);

    expect(mockRedis.eval).toHaveBeenCalledWith(
      expect.any(String),
      1,
      expect.any(String),
      "25000",
      "10",
      String(DELIVERY_TTL),
      "1"
    );
  });

  test("returns allowed=true when Lua script returns [1, usage]", async () => {
    mockRedis.eval.mockResolvedValue([1, 250]);

    const result = await reserveMonthlyQuota("org-1", "hobby", 5);
    expect(result).toEqual({ allowed: true, currentUsage: 250 });
  });

  test("throws TooManyRequestsError with correct message when quota exceeded", async () => {
    mockRedis.eval.mockResolvedValue([0, 25_000]);

    await expect(reserveMonthlyQuota("org-1", "hobby", 1)).rejects.toThrow(
      TooManyRequestsError
    );
    await expect(reserveMonthlyQuota("org-1", "hobby", 1)).rejects.toThrow(
      "Too many requests"
    );
  });

  test("unknown plan falls through to metered defaults", async () => {
    mockRedis.eval.mockResolvedValue([1, 100]);

    await reserveMonthlyQuota("org-1", "unknown-plan", 1);

    expect(mockRedis.eval).toHaveBeenCalledWith(
      expect.any(String),
      1,
      expect.any(String),
      "25000",
      "1",
      String(DELIVERY_TTL),
      "1" // non-hobby plans have hasOverage = true
    );
  });
});

describe("releaseMonthlyQuota", () => {
  beforeEach(() => {
    stringStore.clear();
    setStore.clear();
    mockRedis.eval.mockReset();
  });

  test("returns early for zero count without calling redis", async () => {
    const result = await releaseMonthlyQuota("org-1", 0);
    expect(result).toEqual({ currentUsage: 0 });
    expect(mockRedis.eval).not.toHaveBeenCalled();
  });

  test("calls redis.eval with release script args", async () => {
    mockRedis.eval.mockResolvedValue(90 as unknown);

    await releaseMonthlyQuota("org-1", 10);

    const now = new Date();
    const expectedMonth = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
    const expectedKey = `org:deliveries:org-1:${expectedMonth}`;

    expect(mockRedis.eval).toHaveBeenCalledWith(
      expect.any(String),
      1,
      expectedKey,
      "10",
      String(DELIVERY_TTL)
    );
  });

  test("returns current usage from redis eval", async () => {
    mockRedis.eval.mockResolvedValue(42 as unknown);

    const result = await releaseMonthlyQuota("org-1", 8);

    expect(result).toEqual({ currentUsage: 42 });
  });
});
