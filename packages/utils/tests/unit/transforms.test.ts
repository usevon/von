import { describe, expect, test } from "bun:test";
import { applyTransforms } from "../../src/transforms";

describe("applyTransforms", () => {
  test("removes specified fields", () => {
    const result = applyTransforms({ a: 1, b: 2, c: 3 }, { remove: ["b"] });
    expect(result).toEqual({ a: 1, c: 3 });
  });

  test("removes multiple fields", () => {
    const result = applyTransforms(
      { a: 1, b: 2, c: 3 },
      { remove: ["a", "c"] }
    );
    expect(result).toEqual({ b: 2 });
  });

  test("ignores removing nonexistent fields", () => {
    const result = applyTransforms({ a: 1 }, { remove: ["missing"] });
    expect(result).toEqual({ a: 1 });
  });

  test("renames fields", () => {
    const result = applyTransforms(
      { old: "value" },
      { rename: { old: "new" } }
    );
    expect(result).toEqual({ new: "value" });
  });

  test("skips rename if source field missing", () => {
    const result = applyTransforms({ a: 1 }, { rename: { missing: "new" } });
    expect(result).toEqual({ a: 1 });
  });

  test("adds defaults for missing fields only", () => {
    const result = applyTransforms({ a: 1 }, { defaults: { a: 99, b: 2 } });
    expect(result).toEqual({ a: 1, b: 2 });
  });

  test("applies all transforms in order: remove → rename → defaults", () => {
    const result = applyTransforms(
      { old: "val", temp: true },
      { remove: ["temp"], rename: { old: "new" }, defaults: { extra: 42 } }
    );
    expect(result).toEqual({ new: "val", extra: 42 });
  });

  test("returns copy, does not mutate input", () => {
    const input = { a: 1, b: 2 };
    applyTransforms(input, { remove: ["a"] });
    expect(input).toEqual({ a: 1, b: 2 });
  });

  test("handles empty transforms", () => {
    const result = applyTransforms({ a: 1 }, {});
    expect(result).toEqual({ a: 1 });
  });
});
