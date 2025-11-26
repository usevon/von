import { describe, expect, test } from "bun:test"
import { app } from "../../src/app"
import { createRequest } from "../setup"

describe("Health endpoints", () => {
  test("GET /live returns ok status", async () => {
    const response = await app.handle(createRequest("/live"))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.status).toBe("ok")
    expect(body.uptime).toBeGreaterThan(0)
  })

  test("GET /ready returns ok status", async () => {
    const response = await app.handle(createRequest("/ready"))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.status).toBe("ok")
  })
})
