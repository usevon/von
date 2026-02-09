import { describe, expect, test } from "bun:test";
import { applyTransforms, toISODates } from "../../src/transforms";

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

describe("toISODates", () => {
  test("converts Date fields to ISO strings", () => {
    const date = new Date("2024-01-01T00:00:00Z");
    const result = toISODates({ name: "test", createdAt: date });
    expect(result.createdAt).toBe("2024-01-01T00:00:00.000Z");
    expect(result.name).toBe("test");
  });

  test("leaves non-Date fields unchanged", () => {
    const result = toISODates({ count: 5, label: "x", flag: true });
    expect(result).toEqual({ count: 5, label: "x", flag: true });
  });

  test("handles multiple Date fields", () => {
    const d1 = new Date("2024-01-01T00:00:00Z");
    const d2 = new Date("2024-06-15T12:30:00Z");
    const result = toISODates({ createdAt: d1, updatedAt: d2, name: "test" });
    expect(result.createdAt).toBe("2024-01-01T00:00:00.000Z");
    expect(result.updatedAt).toBe("2024-06-15T12:30:00.000Z");
    expect(result.name).toBe("test");
  });

  test("does not mutate input", () => {
    const date = new Date("2024-01-01T00:00:00Z");
    const input = { createdAt: date };
    toISODates(input);
    expect(input.createdAt).toBeInstanceOf(Date);
  });
});
