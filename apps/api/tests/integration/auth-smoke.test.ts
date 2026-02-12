import { describe, expect, test } from "bun:test";

const integrationTest = process.env.BETTER_AUTH_SECRET ? test : test.skip;

describe("auth smoke", () => {
  integrationTest(
    "returns 401 for protected route without credentials",
    async () => {
      const { client } = await import("../setup");

      const { error } = await client.webhooks.events.get();

      expect(error).toBeDefined();
      expect(error?.status).toBe(401);
      expect(error?.value).toEqual({
        error: "Please sign in or provide a valid API key.",
      });
    }
  );
});
