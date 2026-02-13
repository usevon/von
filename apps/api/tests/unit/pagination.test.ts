import { describe, expect, test } from "bun:test";
import {
  buildCursorScopeHash,
  decodeCursor,
  encodeCursor,
  PAGINATION_ERROR_CODES,
} from "../../src/lib/pagination";

describe("pagination", () => {
  test("encodes and decodes cursor", () => {
    const scopeHash = buildCursorScopeHash({
      resource: "events",
      organizationId: "org_test",
    });

    const encoded = encodeCursor({
      createdAt: new Date("2026-01-02T03:04:05.000Z"),
      id: "550e8400-e29b-41d4-a716-446655440000",
      sort: "desc",
      scopeHash,
    });

    const decoded = decodeCursor(encoded, {
      sort: "desc",
      scopeHash,
    });

    expect(decoded?.id).toBe("550e8400-e29b-41d4-a716-446655440000");
    expect(decoded?.createdAt.toISOString()).toBe("2026-01-02T03:04:05.000Z");
  });

  test("rejects cursor with wrong scope", () => {
    const scopeHash = buildCursorScopeHash({
      resource: "events",
      organizationId: "org_a",
    });

    const encoded = encodeCursor({
      createdAt: new Date("2026-01-02T03:04:05.000Z"),
      id: "550e8400-e29b-41d4-a716-446655440000",
      sort: "desc",
      scopeHash,
    });

    const wrongScope = buildCursorScopeHash({
      resource: "events",
      organizationId: "org_b",
    });

    expect(() =>
      decodeCursor(encoded, {
        sort: "desc",
        scopeHash: wrongScope,
      })
    ).toThrow(PAGINATION_ERROR_CODES.INVALID_CURSOR);
  });
});
