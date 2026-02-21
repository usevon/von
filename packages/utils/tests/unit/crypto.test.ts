import { describe, expect, test } from "bun:test";
import {
  hashSha256,
  hmacSign,
  randomHex,
  timingSafeEqual,
} from "../../src/crypto";

const HEX_REGEX = /^[a-f0-9]+$/;

describe("hashSha256", () => {
  test("returns 64-character hex string", () => {
    const hash = hashSha256("test");
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(HEX_REGEX);
  });

  test("is deterministic", () => {
    const hash1 = hashSha256("hello world");
    const hash2 = hashSha256("hello world");
    expect(hash1).toBe(hash2);
  });

  test("different inputs produce different hashes", () => {
    const hash1 = hashSha256("input1");
    const hash2 = hashSha256("input2");
    expect(hash1).not.toBe(hash2);
  });
});

describe("hmacSign", () => {
  test("returns 64-character hex string", () => {
    const sig = hmacSign("data", "secret");
    expect(sig).toHaveLength(64);
    expect(sig).toMatch(HEX_REGEX);
  });

  test("is deterministic with same data and secret", () => {
    const sig1 = hmacSign("data", "secret");
    const sig2 = hmacSign("data", "secret");
    expect(sig1).toBe(sig2);
  });

  test("different secrets produce different signatures", () => {
    const sig1 = hmacSign("data", "secret1");
    const sig2 = hmacSign("data", "secret2");
    expect(sig1).not.toBe(sig2);
  });

  test("different data produces different signatures", () => {
    const sig1 = hmacSign("data1", "secret");
    const sig2 = hmacSign("data2", "secret");
    expect(sig1).not.toBe(sig2);
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

  test("returns valid hex string", () => {
    const hex = randomHex(16);
    expect(hex).toMatch(HEX_REGEX);
  });
});
