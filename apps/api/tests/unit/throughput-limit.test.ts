import { describe, expect, mock, test, beforeEach } from "bun:test";

const mockEval = mock(() => Promise.resolve([1, 24]));

const mockRedis = {
  eval: mockEval,
};

mock.module("@usevon/queue", () => ({
  getRedisClient: () => mockRedis,
}));

mock.module("@/lib/org-plan", () => ({
  getOrgPlan: () => Promise.resolve("hobby"),
}));

const { checkThroughputLimit } = await import("@/lib/throughput-limit");

describe("checkThroughputLimit", () => {
  beforeEach(() => {
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
    expect(args[4]).toBe("25"); // burst (hobby)
    expect(typeof args[5]).toBe("string"); // now (timestamp)
    expect(args[6]).toBe("3"); // requested tokens
  });

  test("passes correct args for pro plan", async () => {
    mockEval.mockResolvedValue([1, 149]);

    await checkThroughputLimit("org-1", "pro", 1);

    const args = mockEval.mock.calls[0];
    expect(args[3]).toBe("100"); // rate (pro)
    expect(args[4]).toBe("150"); // burst (pro)
    expect(args[6]).toBe("1"); // requested tokens
  });
});
