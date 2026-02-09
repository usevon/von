import { describe, expect, test } from "bun:test";
import { client } from "../setup";

const NON_EXISTENT_ID = "00000000-0000-0000-0000-000000000000";

describe("Inbound public endpoints", () => {
  test("POST /in/:id returns error for non-existent endpoint", async () => {
    const { error } = await client
      .in({ id: NON_EXISTENT_ID })
      .post({ data: "test" });

    expect(error).toBeDefined();
    expect([404, 500]).toContain(error?.status);
  }, 15_000);
});
