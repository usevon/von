import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import { Von } from "../src/client";
import { mockErrorResponse, mockJsonResponse } from "./setup";

describe("Von Client", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe("constructor", () => {
    test("uses default base URL when not provided", () => {
      const von = new Von();
      expect(von).toBeDefined();
    });

    test("uses provided base URL", () => {
      const von = new Von({ baseUrl: "https://api.example.com" });
      expect(von).toBeDefined();
    });

    test("uses provided API key", () => {
      const von = new Von({ apiKey: "test-key" });
      expect(von).toBeDefined();
    });

    test("initializes namespace methods", () => {
      const von = new Von();
      expect(von.webhooks).toBeDefined();
      expect(von.endpoints).toBeDefined();
      expect(von.inbound).toBeDefined();
    });
  });

  describe("request", () => {
    test("sends GET request with correct headers", async () => {
      const mockResponse = mockJsonResponse({ id: "123" });
      const fetchSpy = spyOn(globalThis, "fetch").mockResolvedValue(
        mockResponse as Response
      );

      const von = new Von({
        baseUrl: "https://api.test.com",
        apiKey: "test-key",
      });
      await von.get("/test");

      expect(fetchSpy).toHaveBeenCalled();
      const callArgs = fetchSpy.mock.calls[0];
      expect(callArgs[0]).toBe("https://api.test.com/test");
      expect(callArgs[1]?.method).toBe("GET");
      const headers = callArgs[1]?.headers as Headers;
      expect(headers.get("Authorization")).toBe("Bearer test-key");
    });

    test("sends POST request with body", async () => {
      const mockResponse = mockJsonResponse({ id: "123" });
      const fetchSpy = spyOn(globalThis, "fetch").mockResolvedValue(
        mockResponse as Response
      );

      const von = new Von({
        baseUrl: "https://api.test.com",
        apiKey: "test-key",
      });
      await von.post("/test", { data: "value" });

      expect(fetchSpy).toHaveBeenCalled();
      const callArgs = fetchSpy.mock.calls[0];
      expect(callArgs[0]).toBe("https://api.test.com/test");
      expect(callArgs[1]?.method).toBe("POST");
      const headers = callArgs[1]?.headers as Headers;
      expect(headers.get("Authorization")).toBe("Bearer test-key");
    });

    test("sends PATCH request with body", async () => {
      const mockResponse = mockJsonResponse({ id: "123" });
      const fetchSpy = spyOn(globalThis, "fetch").mockResolvedValue(
        mockResponse as Response
      );

      const von = new Von({
        baseUrl: "https://api.test.com",
        apiKey: "test-key",
      });
      await von.patch("/test", { data: "value" });

      expect(fetchSpy).toHaveBeenCalled();
      const callArgs = fetchSpy.mock.calls[0];
      expect(callArgs[0]).toBe("https://api.test.com/test");
      expect(callArgs[1]?.method).toBe("PATCH");
      const headers = callArgs[1]?.headers as Headers;
      expect(headers.get("Authorization")).toBe("Bearer test-key");
    });

    test("sends DELETE request", async () => {
      const mockResponse = mockJsonResponse({});
      const fetchSpy = spyOn(globalThis, "fetch").mockResolvedValue(
        mockResponse as Response
      );

      const von = new Von({
        baseUrl: "https://api.test.com",
        apiKey: "test-key",
      });
      await von.delete("/test");

      expect(fetchSpy).toHaveBeenCalled();
      const callArgs = fetchSpy.mock.calls[0];
      expect(callArgs[0]).toBe("https://api.test.com/test");
      expect(callArgs[1]?.method).toBe("DELETE");
      const headers = callArgs[1]?.headers as Headers;
      expect(headers.get("Authorization")).toBe("Bearer test-key");
    });

    test("does not include Authorization header when no API key", async () => {
      const mockResponse = mockJsonResponse({ id: "123" });
      const fetchSpy = spyOn(globalThis, "fetch").mockResolvedValue(
        mockResponse as Response
      );

      const von = new Von({ baseUrl: "https://api.test.com" });
      await von.get("/test");

      const callArgs = fetchSpy.mock.calls[0];
      const headers = callArgs[1]?.headers as Record<string, string>;
      expect(headers?.Authorization).toBeUndefined();
    });

    test("returns data on success", async () => {
      const expectedData = { id: "123", name: "test" };
      const mockResponse = mockJsonResponse(expectedData);
      spyOn(globalThis, "fetch").mockResolvedValue(mockResponse as Response);

      const von = new Von({ baseUrl: "https://api.test.com" });
      const result = await von.get<typeof expectedData>("/test");

      expect(result.error).toBeNull();
      expect(result.data).toEqual(expectedData);
    });

    test("returns error on error response", async () => {
      const mockResponse = mockErrorResponse("Not found", "NOT_FOUND", 404);
      spyOn(globalThis, "fetch").mockResolvedValue(mockResponse as Response);

      const von = new Von({ baseUrl: "https://api.test.com" });
      const result = await von.get("/test");

      expect(result.data).toBeNull();
      expect(result.error).not.toBeNull();
      expect(result.error?.status).toBe(404);
    });

    test("error contains correct properties", async () => {
      const mockResponse = mockErrorResponse("Not found", "NOT_FOUND", 404);
      spyOn(globalThis, "fetch").mockResolvedValue(mockResponse as Response);

      const von = new Von({ baseUrl: "https://api.test.com" });
      const result = await von.get("/test");

      expect(result.error).not.toBeNull();
      expect(result.error?.message).toContain("404");
      expect(result.error?.status).toBe(404);
    });
  });
});
