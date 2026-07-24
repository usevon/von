import { describe, expect, test } from "bun:test";
import { hmacSign, randomHex, timingSafeEqual } from "../../src/crypto";

describe("hmacSign", () => {
  test("matches the known answer for data signed with secret", () => {
    expect(hmacSign("data", "secret")).toBe(
      "1b2c16b75bd2a870c114153ccda5bcfca63314bc722fa160d690de133ccbb9db"
    );
  });
});

describe("timingSafeEqual", () => {
  test("returns true for equal strings", () => {
    expect(timingSafeEqual("abc123", "abc123")).toBe(true);
  });

  test("returns false for different strings of same length", () => {
    expect(timingSafeEqual("abc123", "abc124")).toBe(false);
  });

  test("returns false for different length strings", () => {
    expect(timingSafeEqual("short", "longer")).toBe(false);
    expect(timingSafeEqual("abc", "abcdef")).toBe(false);
    expect(timingSafeEqual("abcdef", "abc")).toBe(false);
  });

  test("returns true for empty strings", () => {
    expect(timingSafeEqual("", "")).toBe(true);
  });
});

describe("randomHex", () => {
  test("returns correct length", () => {
    expect(randomHex(16)).toHaveLength(32); // 16 bytes = 32 hex chars
    expect(randomHex(8)).toHaveLength(16);
    expect(randomHex(32)).toHaveLength(64);
  });
});
