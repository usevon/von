import { describe, expect, test } from "bun:test"
import { app } from "../../src/app"
import { createRequest } from "../setup"

describe("Auth endpoints", () => {
  describe("API key auth", () => {
    test("protected route returns 401 without Authorization header", async () => {
      const response = await app.handle(createRequest("/webhooks/events"))

      expect(response.status).toBe(401)
      const body = await response.json()
      expect(body.error).toBe("Invalid API key.")
    })

    test("protected route returns 401 with invalid Bearer token", async () => {
      const response = await app.handle(
        createRequest("/webhooks/events", {
          headers: { Authorization: "Bearer invalid-key" },
        })
      )

      expect(response.status).toBe(401)
      const body = await response.json()
      expect(body.error).toBe("Invalid API key.")
    })

    test("protected route returns 401 with wrong prefix (von_prod instead of von_dev)", async () => {
      const response = await app.handle(
        createRequest("/webhooks/events", {
          headers: { Authorization: "Bearer von_prod_invalidkey123" },
        })
      )

      expect(response.status).toBe(401)
      const body = await response.json()
      expect(body.error).toBe("Invalid API key.")
    })

    test("protected route returns 401 without Bearer prefix", async () => {
      const response = await app.handle(
        createRequest("/webhooks/events", {
          headers: { Authorization: "von_dev_somekey123" },
        })
      )

      expect(response.status).toBe(401)
      const body = await response.json()
      expect(body.error).toBe("Invalid API key.")
    })
  })
})
