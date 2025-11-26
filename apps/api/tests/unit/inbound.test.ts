import { describe, expect, test } from "bun:test"
import { app } from "../../src/app"
import { BASE_URL } from "../setup"

describe("Inbound public endpoints", () => {
  test("POST /in/:id returns 404 for non-existent endpoint", async () => {
    const response = await app.handle(
      new Request(`${BASE_URL}/in/00000000-0000-0000-0000-000000000000`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: "test" }),
      })
    )

    expect(response.status).toBe(404)
  })
})
