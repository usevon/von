import { describe, expect, test } from "bun:test"
import {
  hashSha256,
  hmacSign,
  timingSafeEqual,
  verifyHmac,
  randomHex,
} from "../../src/crypto"

describe("hashSha256", () => {
  test("returns 64-character hex string", () => {
    const hash = hashSha256("test")
    expect(hash).toHaveLength(64)
    expect(hash).toMatch(/^[a-f0-9]+$/)
  })

  test("is deterministic", () => {
    const hash1 = hashSha256("hello world")
    const hash2 = hashSha256("hello world")
    expect(hash1).toBe(hash2)
  })

  test("different inputs produce different hashes", () => {
    const hash1 = hashSha256("input1")
    const hash2 = hashSha256("input2")
    expect(hash1).not.toBe(hash2)
  })
})

describe("hmacSign", () => {
  test("returns 64-character hex string", () => {
    const sig = hmacSign("data", "secret")
    expect(sig).toHaveLength(64)
    expect(sig).toMatch(/^[a-f0-9]+$/)
  })

  test("is deterministic with same data and secret", () => {
    const sig1 = hmacSign("data", "secret")
    const sig2 = hmacSign("data", "secret")
    expect(sig1).toBe(sig2)
  })

  test("different secrets produce different signatures", () => {
    const sig1 = hmacSign("data", "secret1")
    const sig2 = hmacSign("data", "secret2")
    expect(sig1).not.toBe(sig2)
  })

  test("different data produces different signatures", () => {
    const sig1 = hmacSign("data1", "secret")
    const sig2 = hmacSign("data2", "secret")
    expect(sig1).not.toBe(sig2)
  })
})

describe("timingSafeEqual", () => {
  test("returns true for equal strings", () => {
    expect(timingSafeEqual("abc123", "abc123")).toBe(true)
  })

  test("returns false for different strings of same length", () => {
    expect(timingSafeEqual("abc123", "abc124")).toBe(false)
  })

  test("returns false for different length strings", () => {
    expect(timingSafeEqual("short", "longer")).toBe(false)
  })

  test("returns true for empty strings", () => {
    expect(timingSafeEqual("", "")).toBe(true)
  })
})

describe("verifyHmac", () => {
  test("returns true for valid signature", () => {
    const data = "test data"
    const secret = "secret"
    const signature = hmacSign(data, secret)
    expect(verifyHmac(data, signature, secret)).toBe(true)
  })

  test("returns false for invalid signature", () => {
    expect(verifyHmac("data", "invalidsig", "secret")).toBe(false)
  })

  test("returns false for wrong secret", () => {
    const data = "test data"
    const signature = hmacSign(data, "secret1")
    expect(verifyHmac(data, signature, "secret2")).toBe(false)
  })

  test("returns false for tampered data", () => {
    const signature = hmacSign("original", "secret")
    expect(verifyHmac("tampered", signature, "secret")).toBe(false)
  })
})

describe("randomHex", () => {
  test("returns correct length", () => {
    expect(randomHex(16)).toHaveLength(32) // 16 bytes = 32 hex chars
    expect(randomHex(8)).toHaveLength(16)
    expect(randomHex(32)).toHaveLength(64)
  })

  test("returns valid hex string", () => {
    const hex = randomHex(16)
    expect(hex).toMatch(/^[a-f0-9]+$/)
  })

  test("generates different values each time", () => {
    const hex1 = randomHex(16)
    const hex2 = randomHex(16)
    expect(hex1).not.toBe(hex2)
  })
})
