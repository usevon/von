import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { generateIdempotencyKey, vonFetch } from "../../src/fetch";

const originalFetch = globalThis.fetch;
const VON_KEY_PREFIX_REGEX = /^von-\d+-/;
const VON_KEY_FULL_REGEX = /^von-\d+-[a-f0-9-]+$/;

describe("vonFetch", () => {
  beforeEach(() => {
    globalThis.fetch = mock(() =>
      Promise.resolve(
        new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      )
    );
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe("basic requests", () => {
    test("returns data on successful response", async () => {
      const { data, error } = await vonFetch<{ success: boolean }>(
        "https://api.example.com/test"
      );

      expect(error).toBeNull();
      expect(data).toEqual({ success: true });
    });

    test("returns error on failed response", async () => {
      globalThis.fetch = mock(() =>
        Promise.resolve(
          new Response(JSON.stringify({ message: "Not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          })
        )
      );

      const { data, error } = await vonFetch("https://api.example.com/test");

      expect(data).toBeNull();
      expect(error).not.toBeNull();
      expect(error?.status).toBe(404);
    });

    test("returns error on network failure", async () => {
      globalThis.fetch = mock(() => Promise.reject(new Error("Network error")));

      const { data, error } = await vonFetch("https://api.example.com/test");

      expect(data).toBeNull();
      expect(error).not.toBeNull();
      expect(error?.message).toBe("Network error");
    });
  });

  describe("idempotency key", () => {
    test("generates idempotency key for POST requests", async () => {
      let capturedHeaders: Headers | undefined;

      globalThis.fetch = mock((_url: string, init?: RequestInit) => {
        capturedHeaders = new Headers(init?.headers);
        return Promise.resolve(
          new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        );
      });

      await vonFetch("https://api.example.com/test", {
        method: "POST",
        body: { data: "test" },
      });

      expect(capturedHeaders?.get("X-Idempotency-Key")).not.toBeNull();
      expect(capturedHeaders?.get("X-Idempotency-Key")).toMatch(
        VON_KEY_PREFIX_REGEX
      );
    });

    test("does not generate idempotency key for GET requests", async () => {
      let capturedHeaders: Headers | undefined;

      globalThis.fetch = mock((_url: string, init?: RequestInit) => {
        capturedHeaders = new Headers(init?.headers);
        return Promise.resolve(
          new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        );
      });

      await vonFetch("https://api.example.com/test", { method: "GET" });

      expect(capturedHeaders?.get("X-Idempotency-Key")).toBeNull();
    });

    test("uses same idempotency key across retries", async () => {
      const capturedKeys: string[] = [];
      let callCount = 0;

      globalThis.fetch = mock((_url: string, init?: RequestInit) => {
        const headers = new Headers(init?.headers);
        const key = headers.get("X-Idempotency-Key");
        if (key) {
          capturedKeys.push(key);
        }

        callCount += 1;
        if (callCount < 3) {
          return Promise.resolve(new Response(null, { status: 500 }));
        }
        return Promise.resolve(
          new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        );
      });

      await vonFetch("https://api.example.com/test", {
        method: "POST",
        body: { data: "test" },
        retry: { type: "linear", attempts: 3, delay: 10 },
      });

      expect(capturedKeys.length).toBe(3);
      expect(capturedKeys[0]).toBe(capturedKeys[1]);
      expect(capturedKeys[1]).toBe(capturedKeys[2]);
    });
  });

  describe("hooks", () => {
    test("calls onRequest hook", async () => {
      let hookCalled = false;

      await vonFetch("https://api.example.com/test", {
        onRequest: (ctx) => {
          hookCalled = true;
          ctx.headers.set("X-Custom", "value");
          return ctx;
        },
      });

      expect(hookCalled).toBe(true);
    });

    test("calls onSuccess hook on successful response", async () => {
      let successData: unknown;

      await vonFetch<{ success: boolean }>("https://api.example.com/test", {
        onSuccess: (ctx) => {
          successData = ctx.data;
        },
      });

      expect(successData).toEqual({ success: true });
    });

    test("calls onError hook on failed response", async () => {
      globalThis.fetch = mock(() =>
        Promise.resolve(new Response(null, { status: 500 }))
      );

      let errorCalled = false;

      await vonFetch("https://api.example.com/test", {
        onError: () => {
          errorCalled = true;
        },
      });

      expect(errorCalled).toBe(true);
    });

    test("calls onRetry hook before retry", async () => {
      let retryCount = 0;
      let callCount = 0;

      globalThis.fetch = mock(() => {
        callCount += 1;
        if (callCount < 2) {
          return Promise.resolve(new Response(null, { status: 500 }));
        }
        return Promise.resolve(
          new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        );
      });

      await vonFetch("https://api.example.com/test", {
        retry: { type: "linear", attempts: 3, delay: 10 },
        onRetry: () => {
          retryCount += 1;
        },
      });

      expect(retryCount).toBe(1);
    });
  });

  describe("retry", () => {
    test("retries on 5xx errors", async () => {
      let callCount = 0;

      globalThis.fetch = mock(() => {
        callCount += 1;
        if (callCount < 3) {
          return Promise.resolve(new Response(null, { status: 500 }));
        }
        return Promise.resolve(
          new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        );
      });

      const { data, error } = await vonFetch<{ success: boolean }>(
        "https://api.example.com/test",
        { retry: { type: "linear", attempts: 3, delay: 10 } }
      );

      expect(callCount).toBe(3);
      expect(error).toBeNull();
      expect(data).toEqual({ success: true });
    });

    test("stops retrying after max attempts", async () => {
      let callCount = 0;

      globalThis.fetch = mock(() => {
        callCount += 1;
        return Promise.resolve(new Response(null, { status: 500 }));
      });

      const { data, error } = await vonFetch("https://api.example.com/test", {
        retry: { type: "linear", attempts: 3, delay: 10 },
      });

      expect(callCount).toBe(3);
      expect(data).toBeNull();
      expect(error?.status).toBe(500);
    });

    test("does not retry on 4xx errors by default", async () => {
      let callCount = 0;

      globalThis.fetch = mock(() => {
        callCount += 1;
        return Promise.resolve(new Response(null, { status: 400 }));
      });

      await vonFetch("https://api.example.com/test", {
        retry: { type: "linear", attempts: 3, delay: 10 },
      });

      expect(callCount).toBe(1);
    });
  });
});

describe("generateIdempotencyKey", () => {
  test("generates unique keys", () => {
    const key1 = generateIdempotencyKey();
    const key2 = generateIdempotencyKey();

    expect(key1).not.toBe(key2);
  });

  test("follows von-timestamp-uuid format", () => {
    const key = generateIdempotencyKey();

    expect(key).toMatch(VON_KEY_FULL_REGEX);
  });
});
