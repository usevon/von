import { describe, expect, test } from "bun:test";
import { getOrgPlan, invalidateOrgPlanCache } from "../../src/lib/org-plan";

describe("getOrgPlan", () => {
  test("returns hobby as default when org not found", async () => {
    const plan = await getOrgPlan("nonexistent-org");
    expect(plan).toBe("hobby");
  });

  test("returns same plan on repeated calls (cached)", async () => {
    const first = await getOrgPlan("cache-test-org");
    const second = await getOrgPlan("cache-test-org");
    expect(first).toBe(second);
  });
});

describe("invalidateOrgPlanCache", () => {
  test("does not throw for any org id", async () => {
    await invalidateOrgPlanCache("any-org-id");
  });
});
