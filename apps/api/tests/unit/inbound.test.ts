import { describe, expect, test } from "bun:test";
import { client } from "../setup";

describe("Inbound API", () => {
  describe("GET /inbound", () => {
    test("returns 401 without API key", async () => {
      const { error } = await client.inbound.get();

      expect(error?.status).toBe(401);
    });
  });
});
