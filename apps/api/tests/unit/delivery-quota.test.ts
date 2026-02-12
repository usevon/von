import { beforeEach, describe, expect, mock, test } from "bun:test";
import { TooManyRequestsError } from "@usevon/utils";

const mockRedis = {
  eval: mock(() => Promise.resolve([1, 100] as unknown)),
};

mock.module("@usevon/queue", () => ({
  getRedisClient: () => mockRedis,
}));

const { getMonthKey, reserveMonthlyQuota, releaseMonthlyQuota, DELIVERY_TTL } =
  await import("@/lib/delivery-quota");

describe("getMonthKey", () => {
  test("returns correct format", () => {
    const key = getMonthKey("org-123");
    const now = new Date();
    const expectedMonth = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
    expect(key).toBe(`org:deliveries:org-123:${expectedMonth}`);
  });
});

describe("DELIVERY_TTL", () => {
  test("is 45 days in seconds", () => {
    expect(DELIVERY_TTL).toBe(45 * 86_400);
  });
});

describe("reserveMonthlyQuota", () => {
  beforeEach(() => {
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

  test("calls redis.eval with hasOverage=1 for pro plan", async () => {
    mockRedis.eval.mockResolvedValue([1, 500]);

    await reserveMonthlyQuota("org-1", "pro", 10);

    expect(mockRedis.eval).toHaveBeenCalledWith(
      expect.any(String),
      1,
      expect.any(String),
      "100000", // pro monthlyDeliveries
      "10",
      String(DELIVERY_TTL),
      "1" // pro hasOverage = true
    );
  });

  test("returns allowed=true when Lua script returns [1, usage]", async () => {
    mockRedis.eval.mockResolvedValue([1, 250]);

    const result = await reserveMonthlyQuota("org-1", "hobby", 5);
    expect(result).toEqual({ allowed: true, currentUsage: 250 });
  });

  test("throws TooManyRequestsError when Lua script returns [0, usage]", async () => {
    mockRedis.eval.mockResolvedValue([0, 25_000]);

    await expect(reserveMonthlyQuota("org-1", "hobby", 1)).rejects.toThrow(
      TooManyRequestsError
    );
  });

  test("throws with default message when quota exceeded", async () => {
    mockRedis.eval.mockResolvedValue([0, 24_999]);

    await expect(reserveMonthlyQuota("org-1", "hobby", 2)).rejects.toThrow(
      "Too many requests"
    );
  });

  test("falls back to hobby limits for unknown plan", async () => {
    mockRedis.eval.mockResolvedValue([1, 100]);

    await reserveMonthlyQuota("org-1", "unknown-plan", 1);

    expect(mockRedis.eval).toHaveBeenCalledWith(
      expect.any(String),
      1,
      expect.any(String),
      "25000", // falls back to hobby
      "1",
      String(DELIVERY_TTL),
      "0" // hobby hasOverage = false
    );
  });
});

describe("releaseMonthlyQuota", () => {
  beforeEach(() => {
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
