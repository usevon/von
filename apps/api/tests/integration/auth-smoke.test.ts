import { describe, expect, test } from "bun:test";
import { client } from "../setup";

const hasAuthSecret = Boolean(process.env.BETTER_AUTH_SECRET);

describe.skipIf(!hasAuthSecret)("auth smoke", () => {
  test("returns 401 for protected route without credentials", async () => {
    const { error } = await client.webhooks.events.get();

    expect(error).toBeDefined();
    expect(error?.status).toBe(401);
    expect(error?.value).toEqual({
      error: "Please sign in or provide a valid API key.",
    });
  });
});
