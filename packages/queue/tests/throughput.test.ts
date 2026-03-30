import { beforeEach, describe, expect, mock, test } from "bun:test";

const mockEval = mock(() => Promise.resolve([1, 24]));

mock.module("@/connection", () => ({
  getRedisClient: () => ({ eval: mockEval }),
}));

import { checkThroughputLimit, getPlanLimits } from "../src/throughput";

describe("getPlanLimits", () => {
  test("returns hobby limits", () => {
    expect(getPlanLimits("hobby")).toEqual({
      ratePerSecond: 25,
      burstPerSecond: 35,
    });
  });

  test("returns metered limits for non-hobby", () => {
    expect(getPlanLimits("metered")).toEqual({
      ratePerSecond: 100,
      burstPerSecond: 140,
    });
  });

  test("returns metered limits for unknown plan", () => {
    expect(getPlanLimits("enterprise")).toEqual({
      ratePerSecond: 100,
      burstPerSecond: 140,
    });
  });
});

describe("checkThroughputLimit", () => {
  beforeEach(() => {
    mockEval.mockReset();
  });

  test("returns allowed when token bucket has capacity", async () => {
    mockEval.mockResolvedValue([1, 20]);
    const result = await checkThroughputLimit("org-1", "hobby", 1);
    expect(result).toEqual({ allowed: true, remaining: 20 });
  });

  test("returns denied when token bucket is empty", async () => {
    mockEval.mockResolvedValue([0, 0]);
    const result = await checkThroughputLimit("org-1", "hobby", 1);
    expect(result).toEqual({ allowed: false, remaining: 0 });
  });

  test("passes hobby rate and burst to Redis", async () => {
    mockEval.mockResolvedValue([1, 24]);
    await checkThroughputLimit("org-1", "hobby", 5);

    const args = mockEval.mock.calls[0];
    expect(args[2]).toBe("org:throughput:org-1");
    expect(args[3]).toBe("25");
    expect(args[4]).toBe("35");
    expect(args[6]).toBe("5");
  });

  test("passes metered rate and burst to Redis", async () => {
    mockEval.mockResolvedValue([1, 139]);
    await checkThroughputLimit("org-1", "metered", 1);

    const args = mockEval.mock.calls[0];
    expect(args[3]).toBe("100");
    expect(args[4]).toBe("140");
  });
});
