import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import { Von } from "../src/client";
import { mockJsonResponse } from "./setup";

describe("Endpoints Methods", () => {
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
    test("sends POST to /endpoints", async () => {
      const endpoint = {
        id: "ep_123",
        url: "https://example.com/webhook",
        secret: "whsec_123",
        description: "Test endpoint",
        enabled: true,
        retryCount: 3,
        timeoutMs: 30_000,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };
      const mockResponse = mockJsonResponse(endpoint);
      const fetchSpy = spyOn(globalThis, "fetch").mockResolvedValue(
        mockResponse as Response
      );

      const result = await von.endpoints.create({
        url: "https://example.com/webhook",
        description: "Test endpoint",
      });

      expect(fetchSpy).toHaveBeenCalledWith(
        "https://api.test.com/endpoints",
        expect.objectContaining({
          method: "POST",
        })
      );
      expect(result.error).toBeNull();
      expect(result.data?.id).toBe("ep_123");
      expect(result.data?.url).toBe("https://example.com/webhook");
    });

    test("includes optional params in body", async () => {
      const mockResponse = mockJsonResponse({ id: "ep_123" });
      const fetchSpy = spyOn(globalThis, "fetch").mockResolvedValue(
        mockResponse as Response
      );

      await von.endpoints.create({
        url: "https://example.com/webhook",
        enabled: false,
        retryCount: 5,
        timeoutMs: 10_000,
      });

      const callArgs = fetchSpy.mock.calls[0];
      const body = JSON.parse(callArgs[1]?.body as string);
      expect(body.enabled).toBe(false);
      expect(body.retryCount).toBe(5);
      expect(body.timeoutMs).toBe(10_000);
    });
  });

  describe("list", () => {
    test("sends GET to /endpoints", async () => {
      const endpointsResponse = {
        endpoints: [
          {
            id: "ep_1",
            url: "https://example.com/webhook",
            secret: "whsec_1",
            description: null,
            enabled: true,
            retryCount: 3,
            timeoutMs: 30_000,
            createdAt: "2024-01-01T00:00:00Z",
            updatedAt: "2024-01-01T00:00:00Z",
          },
        ],
        total: 1,
      };
      const mockResponse = mockJsonResponse(endpointsResponse);
      const fetchSpy = spyOn(globalThis, "fetch").mockResolvedValue(
        mockResponse as Response
      );

      const result = await von.endpoints.list();

      expect(fetchSpy).toHaveBeenCalledWith(
        "https://api.test.com/endpoints",
        expect.objectContaining({
          method: "GET",
        })
      );
      expect(result.error).toBeNull();
      expect(result.data?.endpoints).toHaveLength(1);
      expect(result.data?.total).toBe(1);
    });

    test("includes pagination params in query string", async () => {
      const mockResponse = mockJsonResponse({ endpoints: [], total: 0 });
      const fetchSpy = spyOn(globalThis, "fetch").mockResolvedValue(
        mockResponse as Response
      );

      await von.endpoints.list({ limit: 10, offset: 20 });

      expect(fetchSpy).toHaveBeenCalledWith(
        "https://api.test.com/endpoints?limit=10&offset=20",
        expect.anything()
      );
    });
  });

  describe("get", () => {
    test("sends GET to /endpoints/:id", async () => {
      const endpoint = {
        id: "ep_123",
        url: "https://example.com/webhook",
        secret: "whsec_123",
        description: "Test endpoint",
        enabled: true,
        retryCount: 3,
        timeoutMs: 30_000,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };
      const mockResponse = mockJsonResponse(endpoint);
      const fetchSpy = spyOn(globalThis, "fetch").mockResolvedValue(
        mockResponse as Response
      );

      const result = await von.endpoints.get("ep_123");

      expect(fetchSpy).toHaveBeenCalledWith(
        "https://api.test.com/endpoints/ep_123",
        expect.objectContaining({
          method: "GET",
        })
      );
      expect(result.error).toBeNull();
      expect(result.data?.id).toBe("ep_123");
    });
  });

  describe("update", () => {
    test("sends PATCH to /endpoints/:id", async () => {
      const endpoint = {
        id: "ep_123",
        url: "https://example.com/webhook-updated",
        secret: "whsec_123",
        description: "Updated endpoint",
        enabled: false,
        retryCount: 5,
        timeoutMs: 30_000,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-02T00:00:00Z",
      };
      const mockResponse = mockJsonResponse(endpoint);
      const fetchSpy = spyOn(globalThis, "fetch").mockResolvedValue(
        mockResponse as Response
      );

      const result = await von.endpoints.update("ep_123", {
        url: "https://example.com/webhook-updated",
        enabled: false,
      });

      expect(fetchSpy).toHaveBeenCalledWith(
        "https://api.test.com/endpoints/ep_123",
        expect.objectContaining({
          method: "PATCH",
        })
      );
      expect(result.error).toBeNull();
      expect(result.data?.url).toBe("https://example.com/webhook-updated");
      expect(result.data?.enabled).toBe(false);
    });
  });

  describe("delete", () => {
    test("sends DELETE to /endpoints/:id", async () => {
      const mockResponse = mockJsonResponse({});
      const fetchSpy = spyOn(globalThis, "fetch").mockResolvedValue(
        mockResponse as Response
      );

      await von.endpoints.delete("ep_123");

      expect(fetchSpy).toHaveBeenCalledWith(
        "https://api.test.com/endpoints/ep_123",
        expect.objectContaining({
          method: "DELETE",
        })
      );
    });
  });
});
