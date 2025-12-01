import { describe, expect, test } from "bun:test"
import { client } from "../setup"

describe("Tunnel endpoints", () => {
  test("POST /register requires authentication", async () => {
    const { error } = await client.register.post({ port: 3000 })

    expect(error).toBeDefined()
    expect(error?.status).toBe(401)
  })

  test("POST /register validates port range", async () => {
    const { error } = await client.register.post(
      { port: 99999 },
      { headers: { authorization: "Bearer invalid-token" } }
    )

    expect(error).toBeDefined()
  })
})
