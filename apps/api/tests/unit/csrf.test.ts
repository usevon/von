import { describe, expect, test } from "bun:test";
import { Elysia } from "elysia";
import { csrfProtection } from "../../src/lib/csrf";

const app = new Elysia()
  .use(csrfProtection())
  .post("/test", () => ({ ok: true }))
  .get("/test", () => ({ ok: true }));

const post = (headers: Record<string, string> = {}) =>
  app.handle(
    new Request("http://localhost/test", {
      method: "POST",
      headers,
    })
  );

describe("csrf-protection", () => {
  test("allows GET requests without origin", async () => {
    const res = await app.handle(
      new Request("http://localhost/test", { method: "GET" })
    );
    expect(res.status).toBe(200);
  });

  test("allows POST with Bearer auth regardless of origin", async () => {
    const res = await post({
      authorization: "Bearer some-api-key",
      cookie: "von.session_token=abc",
    });
    expect(res.status).toBe(200);
  });

  test("allows POST without cookies regardless of origin", async () => {
    const res = await post({});
    expect(res.status).toBe(200);
  });

  test("blocks POST with cookie but no origin", async () => {
    const res = await post({
      cookie: "von.session_token=abc",
    });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("Missing Origin/Referer header");
  });

  test("blocks POST with cookie and disallowed origin", async () => {
    const res = await post({
      cookie: "von.session_token=abc",
      origin: "https://evil.com",
    });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("Origin not allowed");
  });

  test("allows POST with cookie and allowed origin", async () => {
    const res = await post({
      cookie: "von.session_token=abc",
      origin: "http://localhost:3001",
    });
    expect(res.status).toBe(200);
  });

  test("extracts origin from referer when origin header is missing", async () => {
    const res = await post({
      cookie: "von.session_token=abc",
      referer: "http://localhost:3001/dashboard/settings",
    });
    expect(res.status).toBe(200);
  });

  test("blocks invalid referer origin", async () => {
    const res = await post({
      cookie: "von.session_token=abc",
      referer: "https://evil.com/path",
    });
    expect(res.status).toBe(403);
  });
});
