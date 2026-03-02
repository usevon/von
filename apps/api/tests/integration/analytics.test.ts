import { describe, expect, test } from "bun:test";
import { client } from "../setup";
import { getApiKey } from "./setup";

describe("Analytics", () => {
  test("GET /analytics/overview returns 401 without auth", async () => {
    const { error } = await client.analytics.overview.get();

    expect(error?.status).toBe(401);
  });

  test.skipIf(!getApiKey())(
    "GET /analytics/overview rejects API key with session-required error",
    async () => {
      const { error } = await client.analytics.overview.get({
        headers: { authorization: `Bearer ${getApiKey()}` },
      });

      expect(error?.status).toBe(403);
      expect(error?.value).toMatchObject({ code: "SESSION_REQUIRED" });
    }
  );
});
