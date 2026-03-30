import { describe, expect, test } from "bun:test";
import { Elysia } from "elysia";
import { requestGuards } from "../../src/lib/request-guards";

const app = new Elysia()
  .use(requestGuards())
  .post("/test", () => ({ ok: true }))
  .get("/test", () => ({ ok: true }));

const request = (method: string, headers: Record<string, string> = {}, body?: string) =>
  app.handle(
    new Request("http://localhost/test", {
      method,
      headers,
      body,
    })
  );

describe("request-guards", () => {
  test("allows GET requests regardless of size", async () => {
    const res = await request("GET");
    expect(res.status).toBe(200);
  });

  test("allows POST with content-length under limit", async () => {
    const body = JSON.stringify({ data: "small" });
    const res = await request("POST", {
      "content-type": "application/json",
      "content-length": String(body.length),
    }, body);
    expect(res.status).toBe(200);
  });

  test("rejects POST with content-length over limit", async () => {
    const res = await request("POST", {
      "content-type": "application/json",
      "content-length": "999999999",
    }, "x");
    expect(res.status).toBe(413);
  });

  test("rejects POST with oversized body when no content-length", async () => {
    const largeBody = "x".repeat(1_100_000);
    const res = await request("POST", {
      "content-type": "text/plain",
    }, largeBody);
    expect(res.status).toBe(413);
  });

  test("rejects request with URL exceeding max length", async () => {
    const longQuery = `?q=${"a".repeat(3000)}`;
    const res = await app.handle(
      new Request(`http://localhost/test${longQuery}`, { method: "GET" })
    );
    expect(res.status).toBe(414);
  });

  test("ignores negative content-length", async () => {
    const res = await request("POST", {
      "content-type": "application/json",
      "content-length": "-1",
    }, "{}");
    expect(res.status).toBe(200);
  });

  test("ignores non-numeric content-length", async () => {
    const res = await request("POST", {
      "content-type": "application/json",
      "content-length": "abc",
    }, "{}");
    expect(res.status).toBe(200);
  });
});
