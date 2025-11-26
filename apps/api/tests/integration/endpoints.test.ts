import { describe, expect, test } from "bun:test"
import { app } from "../../src/app"
import { createAuthRequest, jsonAuthRequest, BASE_URL } from "../setup"
import { getApiKey } from "./setup"

describe.skipIf(!getApiKey())("Endpoints CRUD", () => {
  const apiKey = getApiKey()!
  let createdEndpointId: string | null = null

  test("POST /endpoints creates endpoint", async () => {
    const response = await app.handle(
      jsonAuthRequest("/endpoints", {
        url: "https://example.com/webhook",
        description: "Integration test endpoint",
      }, apiKey!)
    )

    expect(response.status).toBe(201)
    const body = await response.json()
    expect(body.id).toBeDefined()
    expect(body.url).toBe("https://example.com/webhook")
    expect(body.secret).toMatch(/^whsec_/)
    createdEndpointId = body.id
  })

  test("GET /endpoints returns list", async () => {
    const response = await app.handle(createAuthRequest("/endpoints", apiKey!))

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.endpoints).toBeDefined()
    expect(Array.isArray(body.endpoints)).toBe(true)
    expect(body.total).toBeGreaterThanOrEqual(0)
  })

  test("GET /endpoints/:id returns endpoint", async () => {
    if (!createdEndpointId) return

    const response = await app.handle(
      createAuthRequest(`/endpoints/${createdEndpointId}`, apiKey!)
    )

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.id).toBe(createdEndpointId)
  })

  test("PATCH /endpoints/:id updates endpoint", async () => {
    if (!createdEndpointId) return

    const response = await app.handle(
      new Request(`${BASE_URL}/endpoints/${createdEndpointId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ enabled: false }),
      })
    )

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.enabled).toBe(false)
  })

  test("DELETE /endpoints/:id deletes endpoint", async () => {
    if (!createdEndpointId) return

    const response = await app.handle(
      new Request(`${BASE_URL}/endpoints/${createdEndpointId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      })
    )

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.success).toBe(true)
    createdEndpointId = null
  })
})
