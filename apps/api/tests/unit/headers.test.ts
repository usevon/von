import { describe, expect, test } from "bun:test";
import { toStringHeaders } from "../../src/lib/headers";

describe("toStringHeaders", () => {
  test("keeps string values", () => {
    const result = toStringHeaders({ "content-type": "application/json" });
    expect(result).toEqual({ "content-type": "application/json" });
  });

  test("filters out undefined values", () => {
    const result = toStringHeaders({
      "content-type": "application/json",
      "x-missing": undefined,
    });
    expect(result).toEqual({ "content-type": "application/json" });
  });

  test("returns empty object for all-undefined input", () => {
    const result = toStringHeaders({
      a: undefined,
      b: undefined,
    });
    expect(result).toEqual({});
  });

  test("returns empty object for empty input", () => {
    expect(toStringHeaders({})).toEqual({});
  });
});
