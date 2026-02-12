import { describe, expect, test } from "bun:test";
import { buildRequestFingerprint } from "../../src/lib/idempotency";

describe("idempotency fingerprint", () => {
  test("is stable for same method, route, and payload", async () => {
    const first = new Request("http://localhost/webhooks", {
      method: "POST",
      body: JSON.stringify({ a: 1 }),
      headers: { "content-type": "application/json" },
    });
    const second = new Request("http://localhost/webhooks", {
      method: "POST",
      body: JSON.stringify({ a: 1 }),
      headers: { "content-type": "application/json" },
    });

    const [firstFingerprint, secondFingerprint] = await Promise.all([
      buildRequestFingerprint(first),
      buildRequestFingerprint(second),
    ]);

    expect(firstFingerprint).toBe(secondFingerprint);
  });

  test("changes when route changes", async () => {
    const first = new Request("http://localhost/webhooks", {
      method: "POST",
      body: JSON.stringify({ a: 1 }),
    });
    const second = new Request("http://localhost/endpoints", {
      method: "POST",
      body: JSON.stringify({ a: 1 }),
    });

    const [firstFingerprint, secondFingerprint] = await Promise.all([
      buildRequestFingerprint(first),
      buildRequestFingerprint(second),
    ]);

    expect(firstFingerprint).not.toBe(secondFingerprint);
  });

  test("changes when method changes", async () => {
    const first = new Request("http://localhost/webhooks", {
      method: "POST",
      body: JSON.stringify({ a: 1 }),
    });
    const second = new Request("http://localhost/webhooks", {
      method: "PATCH",
      body: JSON.stringify({ a: 1 }),
    });

    const [firstFingerprint, secondFingerprint] = await Promise.all([
      buildRequestFingerprint(first),
      buildRequestFingerprint(second),
    ]);

    expect(firstFingerprint).not.toBe(secondFingerprint);
  });

  test("changes when payload changes", async () => {
    const first = new Request("http://localhost/webhooks", {
      method: "POST",
      body: JSON.stringify({ a: 1 }),
    });
    const second = new Request("http://localhost/webhooks", {
      method: "POST",
      body: JSON.stringify({ a: 2 }),
    });

    const [firstFingerprint, secondFingerprint] = await Promise.all([
      buildRequestFingerprint(first),
      buildRequestFingerprint(second),
    ]);

    expect(firstFingerprint).not.toBe(secondFingerprint);
  });
});
