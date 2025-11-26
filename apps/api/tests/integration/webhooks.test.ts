import { describe, expect, test } from "bun:test"
import { app } from "../../src/app"
import { createAuthRequest, jsonAuthRequest } from "../setup"
import { getApiKey } from "./setup"

const apiKey = getApiKey()

describe.skipIf(!apiKey)("Webhooks", () => {
  test("POST /webhooks sends webhook event", async () => {
    const response = await app.handle(
      jsonAuthRequest("/webhooks", {
        eventType: "user.created",
        payload: { userId: "test-123", email: "test@example.com" },
      }, apiKey!)
    )

    expect(response.status).toBe(201)
    const body = await response.json()
    expect(body.id).toBeDefined()
    expect(body.eventType).toBe("user.created")
  })

  test("GET /webhooks/events returns event list", async () => {
    const response = await app.handle(createAuthRequest("/webhooks/events", apiKey!))

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.events).toBeDefined()
    expect(Array.isArray(body.events)).toBe(true)
  })
})
