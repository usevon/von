import { describe, expect, test } from "bun:test"
import { client } from "../setup"

const TEST_ID = "550e8400-e29b-41d4-a716-446655440000"

describe("Webhooks endpoints", () => {
  describe("POST /webhooks", () => {
    test("returns 401 without API key", async () => {
      const { error } = await client.webhooks.post({
        eventType: "user.created",
        payload: { id: "123" },
      })

      expect(error?.status).toBe(401)
    })
  })

  describe("GET /webhooks/events", () => {
    test("returns 401 without API key", async () => {
      const { error } = await client.webhooks.events.get()

      expect(error?.status).toBe(401)
    })
  })

  describe("GET /webhooks/events/:id", () => {
    test("returns 401 without API key", async () => {
      const { error } = await client.webhooks.events({ id: TEST_ID }).get()

      expect(error?.status).toBe(401)
    })
  })
})
