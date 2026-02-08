import { describe, expect, test } from "bun:test";

const BLOCKED_HEADERS = new Set([
  "x-von-signature",
  "x-von-timestamp",
  "x-von-inbound-delivery-id",
  "authorization",
  "host",
]);

function filterHeaders(
  original: Record<string, string>
): Record<string, string> {
  const safe: Record<string, string> = {};
  for (const [key, value] of Object.entries(original)) {
    if (!BLOCKED_HEADERS.has(key.toLowerCase())) {
      safe[key] = value;
    }
  }
  return safe;
}

describe("inbound header filtering", () => {
  test("removes x-von-signature", () => {
    const result = filterHeaders({ "X-Von-Signature": "t=123,v1=abc" });
    expect(result).toEqual({});
  });

  test("removes x-von-timestamp", () => {
    const result = filterHeaders({ "X-Von-Timestamp": "123" });
    expect(result).toEqual({});
  });

  test("removes x-von-inbound-delivery-id", () => {
    const result = filterHeaders({ "X-Von-Inbound-Delivery-Id": "del_1" });
    expect(result).toEqual({});
  });

  test("removes authorization", () => {
    const result = filterHeaders({ Authorization: "Bearer token123" });
    expect(result).toEqual({});
  });

  test("removes host", () => {
    const result = filterHeaders({ Host: "evil.com" });
    expect(result).toEqual({});
  });

  test("is case-insensitive", () => {
    const result = filterHeaders({
      AUTHORIZATION: "Bearer token",
      HOST: "evil.com",
      "x-VON-SIGNATURE": "spoofed",
    });
    expect(result).toEqual({});
  });

  test("preserves safe headers", () => {
    const result = filterHeaders({
      "Content-Type": "application/json",
      "X-Request-Id": "req_123",
      "X-Custom-Header": "custom",
    });
    expect(result).toEqual({
      "Content-Type": "application/json",
      "X-Request-Id": "req_123",
      "X-Custom-Header": "custom",
    });
  });

  test("filters blocked and preserves safe in mixed input", () => {
    const result = filterHeaders({
      "Content-Type": "application/json",
      Authorization: "Bearer secret",
      "X-Request-Id": "req_456",
      Host: "internal.host",
      "X-Von-Signature": "spoofed",
    });
    expect(result).toEqual({
      "Content-Type": "application/json",
      "X-Request-Id": "req_456",
    });
  });

  test("handles empty headers", () => {
    const result = filterHeaders({});
    expect(result).toEqual({});
  });
});
