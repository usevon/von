import { describe, expect, test } from "bun:test";
import {
  BLOCKED_HEADERS,
  filterHeaders,
} from "../../src/processors/inbound-headers";

describe("inbound header filtering", () => {
  test("blocks all headers in the blocked set", () => {
    for (const header of BLOCKED_HEADERS) {
      const result = filterHeaders({ [header]: "value" });
      expect(result).toEqual({});
    }
  });

  test("is case-insensitive for blocked headers", () => {
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
