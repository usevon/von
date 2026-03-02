import { describe, expect, test } from "bun:test";
import { client } from "../setup";
import { getApiKey } from "./setup";

describe("Audit log", () => {
  test("GET /audit-log returns 401 without auth", async () => {
    const { error } = await client["audit-log"].get();

    expect(error?.status).toBe(401);
  });

  test.skipIf(!getApiKey())(
    "GET /audit-log rejects API key with session-required error",
    async () => {
      const { error } = await client["audit-log"].get({
        headers: { authorization: `Bearer ${getApiKey()}` },
      });

      expect(error?.status).toBe(403);
      expect(error?.value).toMatchObject({ code: "SESSION_REQUIRED" });
    }
  );
});
