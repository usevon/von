import { describe, expect, test } from "bun:test";
import { client } from "../setup";

const TEST_VERSION = "2024-06-01";

describe("Versions API", () => {
  describe("POST /versions", () => {
    test("returns 401 without API key", async () => {
      const { error } = await client.versions.post({
        version: TEST_VERSION,
        transforms: {
          "product.updated": {
            rename: { features: "items" },
          },
        },
      });

      expect(error?.status).toBe(401);
    });
  });

  describe("GET /versions", () => {
    test("returns 401 without API key", async () => {
      const { error } = await client.versions.get();

      expect(error?.status).toBe(401);
    });
  });

  describe("GET /versions/:version", () => {
    test("returns 401 without API key", async () => {
      const { error } = await client.versions({ version: TEST_VERSION }).get();

      expect(error?.status).toBe(401);
    });
  });

  describe("PATCH /versions/:version", () => {
    test("returns 401 without API key", async () => {
      const { error } = await client.versions({ version: TEST_VERSION }).patch({
        transforms: {
          "product.updated": {
            rename: { features: "newItems" },
          },
        },
      });

      expect(error?.status).toBe(401);
    });
  });

  describe("DELETE /versions/:version", () => {
    test("returns 401 without API key", async () => {
      const { error } = await client
        .versions({ version: TEST_VERSION })
        .delete();

      expect(error?.status).toBe(401);
    });
  });
});
