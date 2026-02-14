import { describe, expect, test } from "bun:test";
import {
  buildCursorScopeHash,
  decodeCursor,
  encodeCursor,
  PAGINATION_ERROR_CODES,
} from "../../src/lib/pagination";

const createCursor = (scopeHash: string) =>
  encodeCursor({
    createdAt: new Date("2026-01-02T03:04:05.000Z"),
    id: "550e8400-e29b-41d4-a716-446655440000",
    sort: "desc",
    scopeHash,
  });

const tamperCursorPart = (cursor: string, index: number, value: string) => {
  const parts = cursor.split(".");
  if (!parts[index]) {
    return cursor;
  }
  parts[index] = value;
  return parts.join(".");
};

const tamperCursorSignature = (cursor: string) => {
  const parts = cursor.split(".");
  const signature = parts[5];
  if (!signature) {
    return cursor;
  }

  const replacement = signature.startsWith("a") ? "b" : "a";
  parts[5] = `${replacement}${signature.slice(1)}`;
  return parts.join(".");
};

describe("pagination", () => {
  test("encodes and decodes cursor", () => {
    const scopeHash = buildCursorScopeHash({
      resource: "events",
      organizationId: "org_test",
    });

    const encoded = createCursor(scopeHash);

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

    const encoded = createCursor(scopeHash);

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

  test("rejects cursor when expected sort does not match", () => {
    const scopeHash = buildCursorScopeHash({
      resource: "events",
      organizationId: "org_sort",
    });

    const encoded = createCursor(scopeHash);

    expect(() =>
      decodeCursor(encoded, {
        sort: "asc",
        scopeHash,
      })
    ).toThrow(PAGINATION_ERROR_CODES.INVALID_CURSOR);
  });

  test("rejects cursor when id is tampered", () => {
    const scopeHash = buildCursorScopeHash({
      resource: "events",
      organizationId: "org_tamper_id",
    });

    const encoded = createCursor(scopeHash);
    const tampered = tamperCursorPart(
      encoded,
      2,
      "550e8400-e29b-41d4-a716-446655440001"
    );

    expect(() =>
      decodeCursor(tampered, {
        sort: "desc",
        scopeHash,
      })
    ).toThrow(PAGINATION_ERROR_CODES.INVALID_CURSOR);
  });

  test("rejects cursor when signature is tampered", () => {
    const scopeHash = buildCursorScopeHash({
      resource: "events",
      organizationId: "org_tamper_sig",
    });

    const encoded = createCursor(scopeHash);
    const tampered = tamperCursorSignature(encoded);

    expect(() =>
      decodeCursor(tampered, {
        sort: "desc",
        scopeHash,
      })
    ).toThrow(PAGINATION_ERROR_CODES.INVALID_CURSOR);
  });

  test("rejects malformed cursor with missing parts", () => {
    const scopeHash = buildCursorScopeHash({
      resource: "events",
      organizationId: "org_parts",
    });

    const encoded = createCursor(scopeHash);
    const malformed = encoded.split(".").slice(0, 5).join(".");

    expect(() =>
      decodeCursor(malformed, {
        sort: "desc",
        scopeHash,
      })
    ).toThrow(PAGINATION_ERROR_CODES.INVALID_CURSOR);
  });

  test("rejects cursor that exceeds max length", () => {
    const scopeHash = buildCursorScopeHash({
      resource: "events",
      organizationId: "org_long",
    });

    expect(() =>
      decodeCursor("a".repeat(257), {
        sort: "desc",
        scopeHash,
      })
    ).toThrow(PAGINATION_ERROR_CODES.INVALID_CURSOR);
  });
});
