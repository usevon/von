import { describe, expect, test } from "bun:test";
import { matchesEventType } from "../../src/webhook";

describe("matchesEventType", () => {
  describe("null patterns (subscribe to all)", () => {
    test("matches any event type when patterns is null", () => {
      expect(matchesEventType("order.created", null)).toBe(true);
      expect(matchesEventType("user.updated", null)).toBe(true);
      expect(matchesEventType("anything", null)).toBe(true);
    });
  });

  describe("empty patterns (subscribe to nothing)", () => {
    test("matches nothing when patterns is empty array", () => {
      expect(matchesEventType("order.created", [])).toBe(false);
      expect(matchesEventType("user.updated", [])).toBe(false);
    });
  });

  describe("exact match", () => {
    test("matches exact event type", () => {
      expect(matchesEventType("order.created", ["order.created"])).toBe(true);
    });

    test("does not match different event type", () => {
      expect(matchesEventType("order.updated", ["order.created"])).toBe(false);
    });

    test("matches when one of multiple patterns matches", () => {
      expect(
        matchesEventType("order.created", ["user.updated", "order.created"])
      ).toBe(true);
    });
  });

  describe("prefix wildcard (order.*)", () => {
    test("matches events with same prefix", () => {
      expect(matchesEventType("order.created", ["order.*"])).toBe(true);
      expect(matchesEventType("order.updated", ["order.*"])).toBe(true);
      expect(matchesEventType("order.deleted", ["order.*"])).toBe(true);
    });

    test("does not match events with different prefix", () => {
      expect(matchesEventType("user.created", ["order.*"])).toBe(false);
    });

    test("matches nested events", () => {
      expect(matchesEventType("order.item.added", ["order.*"])).toBe(true);
    });
  });

  describe("suffix wildcard (*.created)", () => {
    test("matches events with same suffix", () => {
      expect(matchesEventType("order.created", ["*.created"])).toBe(true);
      expect(matchesEventType("user.created", ["*.created"])).toBe(true);
      expect(matchesEventType("product.created", ["*.created"])).toBe(true);
    });

    test("does not match events with different suffix", () => {
      expect(matchesEventType("order.updated", ["*.created"])).toBe(false);
    });
  });

  describe("wildcard all (*)", () => {
    test("matches any event type", () => {
      expect(matchesEventType("order.created", ["*"])).toBe(true);
      expect(matchesEventType("user.updated", ["*"])).toBe(true);
      expect(matchesEventType("anything.here", ["*"])).toBe(true);
    });
  });

  describe("mixed patterns", () => {
    test("matches when any pattern matches", () => {
      const patterns = ["order.*", "user.created", "*.deleted"];

      expect(matchesEventType("order.created", patterns)).toBe(true);
      expect(matchesEventType("order.updated", patterns)).toBe(true);
      expect(matchesEventType("user.created", patterns)).toBe(true);
      expect(matchesEventType("product.deleted", patterns)).toBe(true);
    });

    test("does not match when no pattern matches", () => {
      const patterns = ["order.*", "user.created"];

      expect(matchesEventType("product.updated", patterns)).toBe(false);
      expect(matchesEventType("user.updated", patterns)).toBe(false);
    });
  });
});
