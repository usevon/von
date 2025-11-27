import { describe, expect, test } from "bun:test"
import { app } from "../../src/app"
import { createRequest, jsonRequest } from "../setup"

describe("Endpoints API", () => {
  describe("POST /endpoints", () => {
    test("returns 401 without API key", async () => {
      const response = await app.handle(
        jsonRequest("/endpoints", {
          url: "https://example.com/webhook",
          description: "Test endpoint",
        })
      )

      expect(response.status).toBe(401)
    })
  })

  describe("GET /endpoints", () => {
    test("returns 401 without API key", async () => {
      const response = await app.handle(createRequest("/endpoints"))

      expect(response.status).toBe(401)
    })
  })

  describe("GET /endpoints/:id", () => {
    test("returns 401 without API key", async () => {
      const response = await app.handle(createRequest("/endpoints/550e8400-e29b-41d4-a716-446655440000"))

      expect(response.status).toBe(401)
    })
  })

  describe("PATCH /endpoints/:id", () => {
    test("returns 401 without API key", async () => {
      const response = await app.handle(
        new Request("http://localhost/endpoints/550e8400-e29b-41d4-a716-446655440000", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ enabled: false }),
        })
      )

      expect(response.status).toBe(401)
    })
  })

  describe("DELETE /endpoints/:id", () => {
    test("returns 401 without API key", async () => {
      const response = await app.handle(
        new Request("http://localhost/endpoints/550e8400-e29b-41d4-a716-446655440000", {
          method: "DELETE",
        })
      )

      expect(response.status).toBe(401)
    })
  })
})
