import { describe, expect, test } from "bun:test";
import { getPlanLimits, PLAN_LIMITS } from "../../src/plans";

describe("getPlanLimits", () => {
  test("hobby plan returns correct limits", () => {
    const limits = getPlanLimits("hobby");
    expect(limits).toEqual({
      monthlyDeliveries: 25_000,
      ratePerSecond: 25,
      burstPerSecond: 25,
      hasOverage: false,
    });
  });

  test("metered plan returns correct limits", () => {
    const limits = getPlanLimits("metered");
    expect(limits).toEqual({
      monthlyDeliveries: 100_000,
      ratePerSecond: 100,
      burstPerSecond: 140,
      hasOverage: true,
    });
  });

  test("unknown plan defaults to hobby", () => {
    const limits = getPlanLimits("unknown");
    expect(limits).toEqual(PLAN_LIMITS.hobby);
  });

  test("empty string defaults to hobby", () => {
    const limits = getPlanLimits("");
    expect(limits).toEqual(PLAN_LIMITS.hobby);
  });
});
