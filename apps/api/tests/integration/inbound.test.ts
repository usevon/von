import { describe, expect, test } from "bun:test"
import { app } from "../../src/app"
import { createAuthRequest, jsonAuthRequest, BASE_URL } from "../setup"
import { getApiKey } from "./setup"

const apiKey = getApiKey()

describe.skipIf(!apiKey)("Inbound endpoints", () => {
  let inboundEndpointId: string | null = null

  test("POST /inbound creates inbound endpoint", async () => {
    const response = await app.handle(
      jsonAuthRequest("/inbound", {
        name: "Integration test inbound",
        provider: "stripe",
        forwardUrl: "https://example.com/inbound-webhook",
      }, apiKey!)
    )

    expect(response.status).toBe(201)
    const body = await response.json()
    expect(body.id).toBeDefined()
    expect(body.forwardUrl).toBe("https://example.com/inbound-webhook")
    inboundEndpointId = body.id
  })

  test("GET /inbound returns list", async () => {
    const response = await app.handle(createAuthRequest("/inbound", apiKey!))

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.endpoints).toBeDefined()
    expect(Array.isArray(body.endpoints)).toBe(true)
  })

  test("DELETE /inbound/:id cleans up", async () => {
    if (!inboundEndpointId) return

    const response = await app.handle(
      new Request(`${BASE_URL}/inbound/${inboundEndpointId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      })
    )

    expect(response.status).toBe(200)
  })
})
