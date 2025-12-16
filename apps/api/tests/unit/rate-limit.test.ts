import { describe, expect, test } from "bun:test"
import { getClientIp } from "../../src/lib/rate-limit"

describe("rate-limit", () => {
  describe("getClientIp", () => {
    test("returns unknown when no x-forwarded-for header", () => {
      const request = new Request("http://localhost", {
        headers: {},
      })
      expect(getClientIp(request)).toBe("unknown")
    })

    test("extracts single IP from x-forwarded-for", () => {
      const request = new Request("http://localhost", {
        headers: {
          "x-forwarded-for": "203.0.113.195",
        },
      })
      expect(getClientIp(request)).toBe("203.0.113.195")
    })

    test("extracts last IP from x-forwarded-for chain", () => {
      const request = new Request("http://localhost", {
        headers: {
          "x-forwarded-for": "203.0.113.195, 70.41.3.18, 150.172.238.178",
        },
      })
      expect(getClientIp(request)).toBe("150.172.238.178")
    })

    test("trims whitespace from IPs", () => {
      const request = new Request("http://localhost", {
        headers: {
          "x-forwarded-for": "  203.0.113.195  ,  70.41.3.18  ",
        },
      })
      expect(getClientIp(request)).toBe("70.41.3.18")
    })

    test("handles IPv6 addresses", () => {
      const request = new Request("http://localhost", {
        headers: {
          "x-forwarded-for": "2001:db8::1",
        },
      })
      expect(getClientIp(request)).toBe("2001:db8::1")
    })
  })
})
