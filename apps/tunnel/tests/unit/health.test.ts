import { describe, expect, test } from "bun:test"
import { client } from "../setup"

describe("Health endpoints", () => {
  test("GET /live returns ok status", async () => {
    const { data, error } = await client.live.get()

    if (error) throw error
    expect(data.status).toBe("ok")
    expect(data.uptime).toBeGreaterThan(0)
  })

  test(
    "GET /ready returns service status",
    async () => {
      const { data, error } = await client.ready.get()

      if (error) throw error
      expect(data.services).toBeDefined()
      expect(data.services.database).toBeDefined()
      expect(data.services.redis).toBeDefined()
    },
    15000
  )
})
