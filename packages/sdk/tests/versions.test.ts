import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import { Von } from "../src/client";
import { mockJsonResponse } from "./setup";

describe("Versions Methods", () => {
  let originalFetch: typeof globalThis.fetch;
  let von: Von;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    von = new Von({ baseUrl: "https://api.test.com", apiKey: "test-key" });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe("create", () => {
    test("sends POST to /versions", async () => {
      const version = {
        id: "ver_123",
        version: "2024-06-01",
        transforms: {
          "product.updated": {
            rename: { features: "items" },
            remove: ["internalField"],
          },
        },
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };
      const mockResponse = mockJsonResponse(version);
      const fetchSpy = spyOn(globalThis, "fetch").mockResolvedValue(
        mockResponse as Response
      );

      const result = await von.versions.create({
        version: "2024-06-01",
        transforms: {
          "product.updated": {
            rename: { features: "items" },
            remove: ["internalField"],
          },
        },
      });

      expect(fetchSpy).toHaveBeenCalledWith(
        "https://api.test.com/versions",
        expect.objectContaining({
          method: "POST",
        })
      );
      expect(result.error).toBeNull();
      expect(result.data?.version).toBe("2024-06-01");
      expect(result.data?.transforms["product.updated"].rename).toEqual({
        features: "items",
      });
    });

    test("includes transforms with all mapping types", async () => {
      const mockResponse = mockJsonResponse({ id: "ver_123" });
      const fetchSpy = spyOn(globalThis, "fetch").mockResolvedValue(
        mockResponse as Response
      );

      await von.versions.create({
        version: "2024-06-01",
        transforms: {
          "product.updated": {
            rename: { features: "items", "user.profile.name": "userName" },
            remove: ["internalField", "debug.logs"],
            defaults: { legacyField: null, newField: "default" },
          },
        },
      });

      const callArgs = fetchSpy.mock.calls[0];
      const body = JSON.parse(callArgs[1]?.body as string);
      expect(body.transforms["product.updated"].rename).toEqual({
        features: "items",
        "user.profile.name": "userName",
      });
      expect(body.transforms["product.updated"].remove).toEqual([
        "internalField",
        "debug.logs",
      ]);
      expect(body.transforms["product.updated"].defaults).toEqual({
        legacyField: null,
        newField: "default",
      });
    });
  });

  describe("list", () => {
    test("sends GET to /versions", async () => {
      const versionsResponse = {
        versions: [
          {
            id: "ver_1",
            version: "2024-06-01",
            transforms: {
              "product.updated": { rename: { features: "items" } },
            },
            createdAt: "2024-01-01T00:00:00Z",
            updatedAt: "2024-01-01T00:00:00Z",
          },
        ],
        total: 1,
      };
      const mockResponse = mockJsonResponse(versionsResponse);
      const fetchSpy = spyOn(globalThis, "fetch").mockResolvedValue(
        mockResponse as Response
      );

      const result = await von.versions.list();

      expect(fetchSpy).toHaveBeenCalledWith(
        "https://api.test.com/versions",
        expect.objectContaining({
          method: "GET",
        })
      );
      expect(result.error).toBeNull();
      expect(result.data?.versions).toHaveLength(1);
      expect(result.data?.total).toBe(1);
    });

    test("includes pagination params in query string", async () => {
      const mockResponse = mockJsonResponse({ versions: [], total: 0 });
      const fetchSpy = spyOn(globalThis, "fetch").mockResolvedValue(
        mockResponse as Response
      );

      await von.versions.list({ limit: 10, offset: 20 });

      expect(fetchSpy).toHaveBeenCalledWith(
        "https://api.test.com/versions?limit=10&offset=20",
        expect.anything()
      );
    });
  });

  describe("get", () => {
    test("sends GET to /versions/:version", async () => {
      const version = {
        id: "ver_123",
        version: "2024-06-01",
        transforms: { "product.updated": { rename: { features: "items" } } },
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };
      const mockResponse = mockJsonResponse(version);
      const fetchSpy = spyOn(globalThis, "fetch").mockResolvedValue(
        mockResponse as Response
      );

      const result = await von.versions.get("2024-06-01");

      expect(fetchSpy).toHaveBeenCalledWith(
        "https://api.test.com/versions/2024-06-01",
        expect.objectContaining({
          method: "GET",
        })
      );
      expect(result.error).toBeNull();
      expect(result.data?.version).toBe("2024-06-01");
    });
  });

  describe("update", () => {
    test("sends PATCH to /versions/:version", async () => {
      const version = {
        id: "ver_123",
        version: "2024-06-01",
        transforms: { "product.updated": { rename: { features: "newItems" } } },
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-02T00:00:00Z",
      };
      const mockResponse = mockJsonResponse(version);
      const fetchSpy = spyOn(globalThis, "fetch").mockResolvedValue(
        mockResponse as Response
      );

      const result = await von.versions.update("2024-06-01", {
        transforms: { "product.updated": { rename: { features: "newItems" } } },
      });

      expect(fetchSpy).toHaveBeenCalledWith(
        "https://api.test.com/versions/2024-06-01",
        expect.objectContaining({
          method: "PATCH",
        })
      );
      expect(result.error).toBeNull();
      expect(result.data?.transforms["product.updated"].rename).toEqual({
        features: "newItems",
      });
    });
  });

  describe("delete", () => {
    test("sends DELETE to /versions/:version", async () => {
      const mockResponse = mockJsonResponse({});
      const fetchSpy = spyOn(globalThis, "fetch").mockResolvedValue(
        mockResponse as Response
      );

      await von.versions.delete("2024-06-01");

      expect(fetchSpy).toHaveBeenCalledWith(
        "https://api.test.com/versions/2024-06-01",
        expect.objectContaining({
          method: "DELETE",
        })
      );
    });
  });
});
