import { describe, expect, test } from "bun:test"
import { app } from "../src/app"
import { createRequest } from "./setup"

describe("Auth endpoints", () => {
  describe("API key auth", () => {
    test("protected route returns 401 without API key", async () => {
      const response = await app.handle(createRequest("/webhooks/events"))

      expect(response.status).toBe(401)
    })

    test("protected route returns 401 with invalid API key", async () => {
      const response = await app.handle(
        createRequest("/webhooks/events", {
          headers: { "X-Api-Key": "invalid-key" },
        })
      )

      expect(response.status).toBe(401)
    })
  })
})
