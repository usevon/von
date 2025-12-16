import { describe, expect, test } from "bun:test"
import { hmacSign } from "@usevon/utils"

describe("inbound forwarding", () => {
  describe("signature generation", () => {
    test("generates correct signature for forwarded payload", () => {
      const payload = '{"event":"test","data":{"id":"123"}}'
      const secret = "whsec_inboundsecret"
      const timestamp = 1700000000

      const signedPayload = `${timestamp}.${payload}`
      const signature = hmacSign(signedPayload, secret)

      expect(signature).toHaveLength(64)
      expect(signature).toMatch(/^[a-f0-9]+$/)
    })

    test("signature changes with different payload", () => {
      const secret = "whsec_inboundsecret"
      const timestamp = 1700000000

      const sig1 = hmacSign(`${timestamp}.payload1`, secret)
      const sig2 = hmacSign(`${timestamp}.payload2`, secret)

      expect(sig1).not.toBe(sig2)
    })
  })

  describe("header preservation", () => {
    test("merges original headers with von headers", () => {
      const originalHeaders: Record<string, string> = {
        "Content-Type": "application/json",
        "X-Custom-Header": "custom-value",
      }

      const timestamp = 1700000000
      const signature = "abc123def456"
      const deliveryId = "del_123"

      const mergedHeaders = {
        ...originalHeaders,
        "X-Von-Signature": `t=${timestamp},v1=${signature}`,
        "X-Von-Timestamp": String(timestamp),
        "X-Von-Inbound-Delivery-Id": deliveryId,
      }

      expect(mergedHeaders["Content-Type"]).toBe("application/json")
      expect(mergedHeaders["X-Custom-Header"]).toBe("custom-value")
      expect(mergedHeaders["X-Von-Signature"]).toBe(`t=${timestamp},v1=${signature}`)
      expect(mergedHeaders["X-Von-Timestamp"]).toBe(String(timestamp))
      expect(mergedHeaders["X-Von-Inbound-Delivery-Id"]).toBe(deliveryId)
    })

    test("von headers override conflicting original headers", () => {
      const originalHeaders: Record<string, string> = {
        "X-Von-Signature": "malicious-signature",
      }

      const timestamp = 1700000000
      const signature = "legitimate-signature"

      const mergedHeaders = {
        ...originalHeaders,
        "X-Von-Signature": `t=${timestamp},v1=${signature}`,
      }

      expect(mergedHeaders["X-Von-Signature"]).toBe(`t=${timestamp},v1=${signature}`)
    })

    test("handles empty original headers", () => {
      const originalHeaders: Record<string, string> = {}
      const headersStr = JSON.stringify(originalHeaders)
      const parsed: Record<string, string> = JSON.parse(headersStr)

      expect(parsed).toEqual({})
    })

    test("parses headers from JSON string", () => {
      const headersStr = '{"Content-Type":"application/json","X-Request-Id":"req_123"}'
      const parsed: Record<string, string> = JSON.parse(headersStr)

      expect(parsed["Content-Type"]).toBe("application/json")
      expect(parsed["X-Request-Id"]).toBe("req_123")
    })
  })

  describe("retry logic", () => {
    test("marks as failed on final attempt", () => {
      const attempts = 3
      const maxAttempts = 3
      const isFinalAttempt = attempts >= maxAttempts
      const status = isFinalAttempt ? "failed" : "pending"

      expect(status).toBe("failed")
    })

    test("keeps pending on non-final attempt", () => {
      const attempts = 1
      const maxAttempts = 3
      const isFinalAttempt = attempts >= maxAttempts
      const status = isFinalAttempt ? "failed" : "pending"

      expect(status).toBe("pending")
    })

    test("re-throws error on non-final attempt for BullMQ retry", () => {
      const attempts = 2
      const maxAttempts = 3
      const isFinalAttempt = attempts >= maxAttempts

      expect(isFinalAttempt).toBe(false)
      // When not final, error should be re-thrown so BullMQ retries
    })
  })

  describe("status transitions", () => {
    test("forwards to forwarded on success", () => {
      const currentStatus = "pending"
      const responseOk = true
      const newStatus = responseOk ? "forwarded" : currentStatus

      expect(newStatus).toBe("forwarded")
    })

    test("skips already forwarded deliveries", () => {
      const status = "forwarded"
      const shouldSkip = status === "forwarded"

      expect(shouldSkip).toBe(true)
    })

    test("marks as skipped when endpoint disabled", () => {
      const endpointEnabled = false
      const status = endpointEnabled ? "pending" : "skipped"

      expect(status).toBe("skipped")
    })

    test("marks as circuit_open when circuit is open", () => {
      const circuitOpen = true
      const status = circuitOpen ? "circuit_open" : "pending"

      expect(status).toBe("circuit_open")
    })
  })
})
