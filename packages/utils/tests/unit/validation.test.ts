import { describe, expect, test } from "bun:test"
import { isValidWebhookUrl } from "../../src/validation"

describe("isValidWebhookUrl", () => {
  describe("valid URLs", () => {
    test("allows https URLs", () => {
      expect(isValidWebhookUrl("https://example.com/webhook")).toBe(true)
    })

    test("allows http URLs", () => {
      expect(isValidWebhookUrl("http://example.com/webhook")).toBe(true)
    })

    test("allows URLs with ports", () => {
      expect(isValidWebhookUrl("https://example.com:8080/webhook")).toBe(true)
    })

    test("allows URLs with paths and query params", () => {
      expect(isValidWebhookUrl("https://api.example.com/v1/webhook?key=value")).toBe(true)
    })
  })

  describe("blocks localhost", () => {
    test("blocks localhost", () => {
      expect(isValidWebhookUrl("http://localhost/webhook")).toBe(false)
    })

    test("blocks localhost with port", () => {
      expect(isValidWebhookUrl("http://localhost:3000/webhook")).toBe(false)
    })
  })

  describe("blocks private IPv4 ranges", () => {
    test("blocks 127.x.x.x (loopback)", () => {
      expect(isValidWebhookUrl("http://127.0.0.1/webhook")).toBe(false)
      expect(isValidWebhookUrl("http://127.255.255.255/webhook")).toBe(false)
    })

    test("blocks 10.x.x.x (private class A)", () => {
      expect(isValidWebhookUrl("http://10.0.0.1/webhook")).toBe(false)
      expect(isValidWebhookUrl("http://10.255.255.255/webhook")).toBe(false)
    })

    test("blocks 172.16-31.x.x (private class B)", () => {
      expect(isValidWebhookUrl("http://172.16.0.1/webhook")).toBe(false)
      expect(isValidWebhookUrl("http://172.31.255.255/webhook")).toBe(false)
    })

    test("allows 172.15.x.x and 172.32.x.x (not private)", () => {
      expect(isValidWebhookUrl("http://172.15.0.1/webhook")).toBe(true)
      expect(isValidWebhookUrl("http://172.32.0.1/webhook")).toBe(true)
    })

    test("blocks 192.168.x.x (private class C)", () => {
      expect(isValidWebhookUrl("http://192.168.0.1/webhook")).toBe(false)
      expect(isValidWebhookUrl("http://192.168.255.255/webhook")).toBe(false)
    })

    test("blocks 169.254.x.x (link-local / cloud metadata)", () => {
      expect(isValidWebhookUrl("http://169.254.169.254/webhook")).toBe(false)
      expect(isValidWebhookUrl("http://169.254.0.1/webhook")).toBe(false)
    })

    test("blocks 0.x.x.x", () => {
      expect(isValidWebhookUrl("http://0.0.0.0/webhook")).toBe(false)
    })
  })

  describe("blocks private IPv6 ranges", () => {
    test("blocks ::1 (loopback)", () => {
      expect(isValidWebhookUrl("http://[::1]/webhook")).toBe(false)
    })

    test("blocks fc00: (unique local)", () => {
      expect(isValidWebhookUrl("http://[fc00::1]/webhook")).toBe(false)
    })

    test("blocks fe80: (link-local)", () => {
      expect(isValidWebhookUrl("http://[fe80::1]/webhook")).toBe(false)
    })
  })

  describe("blocks non-http protocols", () => {
    test("blocks ftp://", () => {
      expect(isValidWebhookUrl("ftp://example.com/file")).toBe(false)
    })

    test("blocks file://", () => {
      expect(isValidWebhookUrl("file:///etc/passwd")).toBe(false)
    })

    test("blocks javascript:", () => {
      expect(isValidWebhookUrl("javascript:alert(1)")).toBe(false)
    })
  })

  describe("handles invalid URLs", () => {
    test("returns false for invalid URL", () => {
      expect(isValidWebhookUrl("not-a-url")).toBe(false)
    })

    test("returns false for empty string", () => {
      expect(isValidWebhookUrl("")).toBe(false)
    })
  })
})
