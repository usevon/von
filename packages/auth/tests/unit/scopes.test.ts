import { describe, expect, test } from "bun:test";
import { hasScope, parseScopes } from "../../src/plugins/api-key/scopes";

describe("parseScopes", () => {
  test("returns ['*'] for null", () => {
    expect(parseScopes(null)).toEqual(["*"]);
  });

  test("returns ['*'] for empty string", () => {
    expect(parseScopes("")).toEqual(["*"]);
  });

  test("returns [] for invalid JSON (security: deny by default)", () => {
    expect(parseScopes("not-json")).toEqual([]);
  });

  test("parses valid JSON array", () => {
    expect(parseScopes('["read:webhooks","write:webhooks"]')).toEqual([
      "read:webhooks",
      "write:webhooks",
    ]);
  });
});

describe("hasScope", () => {
  test("wildcard grants everything", () => {
    expect(hasScope(["*"], "read:webhooks")).toBe(true);
    expect(hasScope(["*"], "write:endpoints")).toBe(true);
    expect(hasScope(["*"], "anything")).toBe(true);
  });

  test("exact match works", () => {
    expect(hasScope(["read:webhooks"], "read:webhooks")).toBe(true);
    expect(hasScope(["write:endpoints"], "write:endpoints")).toBe(true);
  });

  test("read wildcard matches read scopes", () => {
    expect(hasScope(["read:*"], "read:webhooks")).toBe(true);
    expect(hasScope(["read:*"], "read:endpoints")).toBe(true);
    expect(hasScope(["read:*"], "read:inbound")).toBe(true);
  });

  test("write wildcard matches write scopes", () => {
    expect(hasScope(["write:*"], "write:webhooks")).toBe(true);
    expect(hasScope(["write:*"], "write:endpoints")).toBe(true);
  });

  test("read wildcard does not match write scopes", () => {
    expect(hasScope(["read:*"], "write:webhooks")).toBe(false);
  });

  test("write wildcard does not match read scopes", () => {
    expect(hasScope(["write:*"], "read:webhooks")).toBe(false);
  });

  test("specific scope does not match other scopes", () => {
    expect(hasScope(["read:webhooks"], "read:endpoints")).toBe(false);
    expect(hasScope(["write:webhooks"], "write:endpoints")).toBe(false);
  });

  test("empty scopes denies everything", () => {
    expect(hasScope([], "read:webhooks")).toBe(false);
  });

  test("multiple scopes checked correctly", () => {
    const scopes = ["read:webhooks", "write:endpoints"];
    expect(hasScope(scopes, "read:webhooks")).toBe(true);
    expect(hasScope(scopes, "write:endpoints")).toBe(true);
    expect(hasScope(scopes, "write:webhooks")).toBe(false);
    expect(hasScope(scopes, "read:endpoints")).toBe(false);
  });
});
