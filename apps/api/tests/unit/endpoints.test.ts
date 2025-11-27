import { describe, expect, test } from "bun:test"
import { client } from "../setup"

const TEST_ID = "550e8400-e29b-41d4-a716-446655440000"

describe("Endpoints API", () => {
  describe("POST /endpoints", () => {
    test("returns 401 without API key", async () => {
      const { error } = await client.endpoints.post({
        url: "https://example.com/webhook",
        description: "Test endpoint",
      })

      expect(error?.status).toBe(401)
    })
  })

  describe("GET /endpoints", () => {
    test("returns 401 without API key", async () => {
      const { error } = await client.endpoints.get()

      expect(error?.status).toBe(401)
    })
  })

  describe("GET /endpoints/:id", () => {
    test("returns 401 without API key", async () => {
      const { error } = await client.endpoints({ id: TEST_ID }).get()

      expect(error?.status).toBe(401)
    })
  })

  describe("PATCH /endpoints/:id", () => {
    test("returns 401 without API key", async () => {
      const { error } = await client.endpoints({ id: TEST_ID }).patch({
        enabled: false,
      })

      expect(error?.status).toBe(401)
    })
  })

  describe("DELETE /endpoints/:id", () => {
    test("returns 401 without API key", async () => {
      const { error } = await client.endpoints({ id: TEST_ID }).delete()

      expect(error?.status).toBe(401)
    })
  })
})
