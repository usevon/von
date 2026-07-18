import { describe, expect, test } from "bun:test";
import { getOrgPlan, invalidateOrgPlanCache } from "../../src/lib/org-plan";

describe("getOrgPlan", () => {
  test("returns hobby as default when org not found", async () => {
    const plan = await getOrgPlan("00000000-0000-0000-0000-0000000000aa");
    expect(plan).toBe("hobby");
  });

  test("returns same plan on repeated calls (cached)", async () => {
    const first = await getOrgPlan("00000000-0000-0000-0000-0000000000bb");
    const second = await getOrgPlan("00000000-0000-0000-0000-0000000000bb");
    expect(first).toBe(second);
  });
});

describe("invalidateOrgPlanCache", () => {
  test("does not throw for any org id", async () => {
    await invalidateOrgPlanCache("any-org-id");
  });
});
