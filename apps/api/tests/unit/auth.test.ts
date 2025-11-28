import { describe, expect, test } from "bun:test"
import { client } from "../setup"

describe("Auth endpoints", () => {
  describe("API key auth", () => {
    test("protected route returns 401 without Authorization header", async () => {
      const { error } = await client.webhooks.events.get()

      expect(error).toBeDefined()
      expect(error?.status).toBe(401)
      expect(error?.value).toEqual({ error: "Invalid API key." })
    })

    test("protected route returns 401 with invalid Bearer token", async () => {
      const { error } = await client.webhooks.events.get({
        headers: { authorization: "Bearer invalid-key" },
      })

      expect(error).toBeDefined()
      expect(error?.status).toBe(401)
      expect(error?.value).toEqual({ error: "Invalid API key." })
    })

    test("protected route returns 401 with wrong prefix (von_prod instead of von_dev)", async () => {
      const { error } = await client.webhooks.events.get({
        headers: { authorization: "Bearer von_prod_invalidkey123" },
      })

      expect(error).toBeDefined()
      expect(error?.status).toBe(401)
      expect(error?.value).toEqual({ error: "Invalid API key." })
    })

    test("protected route returns 401 without Bearer prefix", async () => {
      const { error } = await client.webhooks.events.get({
        headers: { authorization: "von_dev_somekey123" },
      })

      expect(error).toBeDefined()
      expect(error?.status).toBe(401)
      expect(error?.value).toEqual({ error: "Invalid API key." })
    })
  })
})
