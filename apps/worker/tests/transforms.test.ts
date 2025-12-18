import { describe, expect, test } from "bun:test";
import { applyTransforms } from "@usevon/utils";

describe("applyTransforms", () => {
  describe("remove", () => {
    test("removes specified fields", () => {
      const payload = { id: "123", secret: "abc", name: "test" };
      const transforms = { remove: ["secret"] };

      const result = applyTransforms(payload, transforms);

      expect(result).toEqual({ id: "123", name: "test" });
    });

    test("removes multiple fields", () => {
      const payload = { a: 1, b: 2, c: 3, d: 4 };
      const transforms = { remove: ["b", "d"] };

      const result = applyTransforms(payload, transforms);

      expect(result).toEqual({ a: 1, c: 3 });
    });

    test("ignores non-existent fields", () => {
      const payload = { id: "123" };
      const transforms = { remove: ["nonexistent"] };

      const result = applyTransforms(payload, transforms);

      expect(result).toEqual({ id: "123" });
    });
  });

  describe("rename", () => {
    test("renames specified fields", () => {
      const payload = { features: ["sso", "api"] };
      const transforms = { rename: { features: "entitlements" } };

      const result = applyTransforms(payload, transforms);

      expect(result).toEqual({ entitlements: ["sso", "api"] });
    });

    test("renames multiple fields", () => {
      const payload = { oldName: "value1", anotherOld: "value2" };
      const transforms = {
        rename: { oldName: "newName", anotherOld: "anotherNew" },
      };

      const result = applyTransforms(payload, transforms);

      expect(result).toEqual({ newName: "value1", anotherNew: "value2" });
    });

    test("ignores non-existent fields", () => {
      const payload = { existing: "value" };
      const transforms = { rename: { nonexistent: "renamed" } };

      const result = applyTransforms(payload, transforms);

      expect(result).toEqual({ existing: "value" });
    });
  });

  describe("defaults", () => {
    test("adds default for missing fields", () => {
      const payload = { id: "123" };
      const transforms = { defaults: { prices: [] } };

      const result = applyTransforms(payload, transforms);

      expect(result).toEqual({ id: "123", prices: [] });
    });

    test("does not override existing fields", () => {
      const payload = { id: "123", prices: [100, 200] };
      const transforms = { defaults: { prices: [] } };

      const result = applyTransforms(payload, transforms);

      expect(result).toEqual({ id: "123", prices: [100, 200] });
    });

    test("adds multiple defaults", () => {
      const payload = { id: "123" };
      const transforms = { defaults: { status: "active", count: 0 } };

      const result = applyTransforms(payload, transforms);

      expect(result).toEqual({ id: "123", status: "active", count: 0 });
    });
  });

  describe("combined transforms", () => {
    test("applies all transforms in order: remove, rename, defaults", () => {
      const payload = {
        features: ["sso"],
        internalId: "secret",
        name: "test",
      };
      const transforms = {
        remove: ["internalId"],
        rename: { features: "entitlements" },
        defaults: { prices: [] },
      };

      const result = applyTransforms(payload, transforms);

      expect(result).toEqual({
        entitlements: ["sso"],
        name: "test",
        prices: [],
      });
    });
  });

  describe("edge cases", () => {
    test("handles empty transforms", () => {
      const payload = { id: "123" };
      const transforms = {};

      const result = applyTransforms(payload, transforms);

      expect(result).toEqual({ id: "123" });
    });

    test("handles empty payload", () => {
      const payload = {};
      const transforms = { defaults: { id: "default" } };

      const result = applyTransforms(payload, transforms);

      expect(result).toEqual({ id: "default" });
    });

    test("does not mutate original payload", () => {
      const payload = { id: "123", secret: "abc" };
      const transforms = { remove: ["secret"] };

      applyTransforms(payload, transforms);

      expect(payload).toEqual({ id: "123", secret: "abc" });
    });
  });
});
