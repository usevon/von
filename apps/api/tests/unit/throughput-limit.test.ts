import { beforeEach, describe, expect, mock, test } from "bun:test";

const mockEval = mock(() => Promise.resolve([1, 24]));
const stringStore = new Map<string, string>();
const setStore = new Map<string, Set<string>>();

const mockRedis = {
  eval: mockEval,
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

mock.module("@/lib/org-plan", () => ({
  getOrgPlan: () => Promise.resolve("hobby"),
}));

const { checkThroughputLimit } = await import("@/lib/throughput-limit");

describe("checkThroughputLimit", () => {
  beforeEach(() => {
    stringStore.clear();
    setStore.clear();
    mockEval.mockReset();
  });

  test("returns allowed: true when script returns [1, N]", async () => {
    mockEval.mockResolvedValue([1, 20]);

    const result = await checkThroughputLimit("org-1", "hobby", 1);

    expect(result).toEqual({ allowed: true, remaining: 20 });
  });

  test("returns allowed: false when script returns [0, N]", async () => {
    mockEval.mockResolvedValue([0, 0]);

    const result = await checkThroughputLimit("org-1", "hobby", 1);

    expect(result).toEqual({ allowed: false, remaining: 0 });
  });

  test("passes correct args to Redis eval for hobby plan", async () => {
    mockEval.mockResolvedValue([1, 24]);

    await checkThroughputLimit("org-1", "hobby", 3);

    expect(mockEval).toHaveBeenCalledTimes(1);
    const args = mockEval.mock.calls[0];
    // args: script, numkeys, key, rate, burst, now, requested
    expect(args[1]).toBe(1); // numkeys
    expect(args[2]).toBe("org:throughput:org-1"); // key
    expect(args[3]).toBe("25"); // rate (hobby)
    expect(args[4]).toBe("35"); // burst (hobby, 1.4x rate)
    expect(typeof args[5]).toBe("string"); // now (timestamp)
    expect(args[6]).toBe("3"); // requested tokens
  });

  test("passes correct args for pro plan", async () => {
    mockEval.mockResolvedValue([1, 149]);

    await checkThroughputLimit("org-1", "pro", 1);

    const args = mockEval.mock.calls[0];
    expect(args[3]).toBe("100"); // rate (pro)
    expect(args[4]).toBe("140"); // burst (pro, 1.4x rate)
    expect(args[6]).toBe("1"); // requested tokens
  });
});
