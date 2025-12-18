import { describe, expect, test } from "bun:test"
import { hmacSign, verifySignature, hasValidPrefix } from "../../src/plugins/api-key/crypto"

describe("hmacSign", () => {
  test("returns 32-character signature (truncated)", () => {
    const sig = hmacSign("data", "secret")
    expect(sig).toHaveLength(32)
  })

  test("returns valid hex string", () => {
    const sig = hmacSign("data", "secret")
    expect(sig).toMatch(/^[a-f0-9]+$/)
  })

  test("is deterministic", () => {
    const sig1 = hmacSign("data", "secret")
    const sig2 = hmacSign("data", "secret")
    expect(sig1).toBe(sig2)
  })

  test("different secrets produce different signatures", () => {
    const sig1 = hmacSign("data", "secret1")
    const sig2 = hmacSign("data", "secret2")
    expect(sig1).not.toBe(sig2)
  })
})

describe("verifySignature", () => {
  const secret = "test-signing-secret"

  test("returns true for valid signed key", () => {
    const random = "abcdefghij1234567890abcdefghij1234567890abcdefghij1234567890abcd"
    const signature = hmacSign(random, secret)
    const key = `von_dev_${random}.${signature}`
    expect(verifySignature(key, secret)).toBe(true)
  })

  test("returns false for invalid signature", () => {
    const key = "von_dev_abcdefghij1234567890abcdefghij1234567890abcdefghij1234567890abcd.invalidsig"
    expect(verifySignature(key, secret)).toBe(false)
  })

  test("returns false for key without dot separator", () => {
    const key = "von_dev_abcdefghij1234567890abcdefghij1234567890abcdefghij1234567890abcd"
    expect(verifySignature(key, secret)).toBe(false)
  })

  test("returns false for key without valid prefix", () => {
    const random = "abcdefghij1234567890abcdefghij1234567890abcdefghij1234567890abcd"
    const signature = hmacSign(random, secret)
    const key = `invalid_${random}.${signature}`
    expect(verifySignature(key, secret)).toBe(false)
  })

  test("returns false for wrong secret", () => {
    const random = "abcdefghij1234567890abcdefghij1234567890abcdefghij1234567890abcd"
    const signature = hmacSign(random, "other-secret")
    const key = `von_dev_${random}.${signature}`
    expect(verifySignature(key, secret)).toBe(false)
  })

  test("works with all valid prefixes", () => {
    const random = "abcdefghij1234567890abcdefghij1234567890abcdefghij1234567890abcd"

    for (const prefix of ["von_dev_", "von_stg_", "von_prod_"]) {
      const signature = hmacSign(random, secret)
      const key = `${prefix}${random}.${signature}`
      expect(verifySignature(key, secret)).toBe(true)
    }
  })
})

describe("hasValidPrefix", () => {
  test("returns true for von_dev_ prefix", () => {
    expect(hasValidPrefix("von_dev_abc123")).toBe(true)
  })

  test("returns true for von_stg_ prefix", () => {
    expect(hasValidPrefix("von_stg_abc123")).toBe(true)
  })

  test("returns true for von_prod_ prefix", () => {
    expect(hasValidPrefix("von_prod_abc123")).toBe(true)
  })

  test("returns false for invalid prefix", () => {
    expect(hasValidPrefix("invalid_abc123")).toBe(false)
  })

  test("returns false for partial prefix", () => {
    expect(hasValidPrefix("von_abc123")).toBe(false)
  })

  test("returns false for empty string", () => {
    expect(hasValidPrefix("")).toBe(false)
  })
})
