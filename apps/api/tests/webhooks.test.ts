import { describe, expect, test } from "bun:test"
import { app } from "../src/app"
import { createRequest, jsonRequest } from "./setup"

describe("Webhooks endpoints", () => {
  describe("POST /webhooks", () => {
    test("returns 401 without API key", async () => {
      const response = await app.handle(
        jsonRequest("/webhooks", {
          eventType: "user.created",
          payload: { id: "123" },
        })
      )

      expect(response.status).toBe(401)
    })
  })

  describe("GET /webhooks/events", () => {
    test("returns 401 without API key", async () => {
      const response = await app.handle(createRequest("/webhooks/events"))

      expect(response.status).toBe(401)
    })
  })

  describe("GET /webhooks/events/:id", () => {
    test("returns 401 without API key", async () => {
      const response = await app.handle(createRequest("/webhooks/events/test-id"))

      expect(response.status).toBe(401)
    })
  })
})
