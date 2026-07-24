import { describe, expect, test } from "bun:test";
import {
  hasValidPrefix,
  hmacSign,
  verifySignature,
} from "../../src/plugins/api-key/crypto";

describe("hmacSign", () => {
  test("returns 32-character signature (truncated)", () => {
    const sig = hmacSign("data", "secret");
    expect(sig).toHaveLength(32);
  });
});

describe("verifySignature", () => {
  const secret = "test-signing-secret";

  test("returns true for valid signed key", () => {
    const random =
      "abcdefghij1234567890abcdefghij1234567890abcdefghij1234567890abcd";
    const signature = hmacSign(random, secret);
    const key = `von_dev_${random}.${signature}`;
    expect(verifySignature(key, secret)).toBe(true);
  });

  test("returns false for invalid signature", () => {
    const key =
      "von_dev_abcdefghij1234567890abcdefghij1234567890abcdefghij1234567890abcd.invalidsig";
    expect(verifySignature(key, secret)).toBe(false);
  });

  test("returns false for key without dot separator", () => {
    const key =
      "von_dev_abcdefghij1234567890abcdefghij1234567890abcdefghij1234567890abcd";
    expect(verifySignature(key, secret)).toBe(false);
  });

  test("returns false for key without valid prefix", () => {
    const random =
      "abcdefghij1234567890abcdefghij1234567890abcdefghij1234567890abcd";
    const signature = hmacSign(random, secret);
    const key = `invalid_${random}.${signature}`;
    expect(verifySignature(key, secret)).toBe(false);
  });

  test("returns false for wrong secret", () => {
    const random =
      "abcdefghij1234567890abcdefghij1234567890abcdefghij1234567890abcd";
    const signature = hmacSign(random, "other-secret");
    const key = `von_dev_${random}.${signature}`;
    expect(verifySignature(key, secret)).toBe(false);
  });

  test("works with all valid prefixes", () => {
    const random =
      "abcdefghij1234567890abcdefghij1234567890abcdefghij1234567890abcd";

    for (const prefix of ["von_dev_", "von_stg_", "von_prod_"]) {
      const signature = hmacSign(random, secret);
      const key = `${prefix}${random}.${signature}`;
      expect(verifySignature(key, secret)).toBe(true);
    }
  });
});

describe("hasValidPrefix", () => {
  test.each([
    ["von_dev_abc123", true],
    ["von_stg_abc123", true],
    ["von_prod_abc123", true],
    ["invalid_abc123", false],
  ])("hasValidPrefix(%p) returns %p", (key, expected) => {
    expect(hasValidPrefix(key)).toBe(expected);
  });
});
