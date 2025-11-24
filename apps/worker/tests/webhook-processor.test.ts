import { describe, expect, test } from "bun:test"

describe("Webhook processor", () => {
  describe("HMAC signature generation", () => {
    test("generates valid sha256 signature", async () => {
      const { createHmac } = await import("crypto")

      const payload = JSON.stringify({ id: "123", type: "test" })
      const secret = "test-secret"

      const hmac = createHmac("sha256", secret)
      hmac.update(payload)
      const signature = hmac.digest("hex")

      expect(signature).toHaveLength(64)
      expect(signature).toMatch(/^[a-f0-9]+$/)
    })
  })

  describe("AbortSignal.timeout", () => {
    test("creates valid timeout signal", () => {
      const signal = AbortSignal.timeout(1000)

      expect(signal).toBeInstanceOf(AbortSignal)
      expect(signal.aborted).toBe(false)
    })

    test("aborts after specified time", async () => {
      const signal = AbortSignal.timeout(50)

      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(signal.aborted).toBe(true)
    })
  })
})
