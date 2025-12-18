import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import { Von } from "../src/client";
import { mockJsonResponse } from "./setup";

describe("Inbound Methods", () => {
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
    test("sends POST to /inbound", async () => {
      const inbound = {
        id: "in_123",
        name: "Stripe Webhooks",
        provider: "stripe",
        secret: "insec_123",
        forwardUrl: "https://myapp.com/webhook",
        enabled: true,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };
      const mockResponse = mockJsonResponse(inbound);
      const fetchSpy = spyOn(globalThis, "fetch").mockResolvedValue(
        mockResponse as Response
      );

      const result = await von.inbound.create({
        name: "Stripe Webhooks",
        provider: "stripe",
        forwardUrl: "https://myapp.com/webhook",
      });

      expect(fetchSpy).toHaveBeenCalledWith(
        "https://api.test.com/inbound",
        expect.objectContaining({
          method: "POST",
        })
      );
      expect(result.error).toBeNull();
      expect(result.data?.id).toBe("in_123");
      expect(result.data?.name).toBe("Stripe Webhooks");
    });
  });

  describe("list", () => {
    test("sends GET to /inbound", async () => {
      const inboundResponse = {
        inboundEndpoints: [
          {
            id: "in_1",
            name: "Stripe",
            provider: "stripe",
            secret: "insec_1",
            forwardUrl: "https://myapp.com/webhook",
            enabled: true,
            createdAt: "2024-01-01T00:00:00Z",
            updatedAt: "2024-01-01T00:00:00Z",
          },
        ],
        total: 1,
      };
      const mockResponse = mockJsonResponse(inboundResponse);
      const fetchSpy = spyOn(globalThis, "fetch").mockResolvedValue(
        mockResponse as Response
      );

      const result = await von.inbound.list();

      expect(fetchSpy).toHaveBeenCalledWith(
        "https://api.test.com/inbound",
        expect.objectContaining({
          method: "GET",
        })
      );
      expect(result.error).toBeNull();
      expect(result.data?.inboundEndpoints).toHaveLength(1);
      expect(result.data?.total).toBe(1);
    });

    test("includes pagination params in query string", async () => {
      const mockResponse = mockJsonResponse({ inboundEndpoints: [], total: 0 });
      const fetchSpy = spyOn(globalThis, "fetch").mockResolvedValue(
        mockResponse as Response
      );

      await von.inbound.list({ limit: 10, offset: 20 });

      expect(fetchSpy).toHaveBeenCalledWith(
        "https://api.test.com/inbound?limit=10&offset=20",
        expect.anything()
      );
    });
  });

  describe("get", () => {
    test("sends GET to /inbound/:id", async () => {
      const inbound = {
        id: "in_123",
        name: "Stripe Webhooks",
        provider: "stripe",
        secret: "insec_123",
        forwardUrl: "https://myapp.com/webhook",
        enabled: true,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };
      const mockResponse = mockJsonResponse(inbound);
      const fetchSpy = spyOn(globalThis, "fetch").mockResolvedValue(
        mockResponse as Response
      );

      const result = await von.inbound.get("in_123");

      expect(fetchSpy).toHaveBeenCalledWith(
        "https://api.test.com/inbound/in_123",
        expect.objectContaining({
          method: "GET",
        })
      );
      expect(result.error).toBeNull();
      expect(result.data?.id).toBe("in_123");
    });
  });

  describe("update", () => {
    test("sends PATCH to /inbound/:id", async () => {
      const inbound = {
        id: "in_123",
        name: "Updated Stripe Webhooks",
        provider: "stripe",
        secret: "insec_123",
        forwardUrl: "https://myapp.com/webhook-v2",
        enabled: false,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-02T00:00:00Z",
      };
      const mockResponse = mockJsonResponse(inbound);
      const fetchSpy = spyOn(globalThis, "fetch").mockResolvedValue(
        mockResponse as Response
      );

      const result = await von.inbound.update("in_123", {
        name: "Updated Stripe Webhooks",
        enabled: false,
      });

      expect(fetchSpy).toHaveBeenCalledWith(
        "https://api.test.com/inbound/in_123",
        expect.objectContaining({
          method: "PATCH",
        })
      );
      expect(result.error).toBeNull();
      expect(result.data?.name).toBe("Updated Stripe Webhooks");
      expect(result.data?.enabled).toBe(false);
    });
  });

  describe("delete", () => {
    test("sends DELETE to /inbound/:id", async () => {
      const mockResponse = mockJsonResponse({});
      const fetchSpy = spyOn(globalThis, "fetch").mockResolvedValue(
        mockResponse as Response
      );

      await von.inbound.delete("in_123");

      expect(fetchSpy).toHaveBeenCalledWith(
        "https://api.test.com/inbound/in_123",
        expect.objectContaining({
          method: "DELETE",
        })
      );
    });
  });
});
