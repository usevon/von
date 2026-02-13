import { describe, expect, test } from "bun:test";
import { client } from "../setup";
import { getApiKey } from "./setup";

const apiKey = getApiKey();

describe.skipIf(!apiKey)("Webhooks", () => {
  test("POST /webhooks sends webhook event", async () => {
    const { data, error } = await client.webhooks.post(
      {
        eventType: "user.created",
        payload: { userId: "test-123", email: "test@example.com" },
      },
      {
        headers: { authorization: `Bearer ${apiKey}` },
      }
    );

    if (error) {
      throw error;
    }
    expect(data.id).toBeDefined();
    expect(data.eventType).toBe("user.created");
  });

  test("GET /webhooks/events returns event list", async () => {
    const { data, error } = await client.webhooks.events.get({
      headers: { authorization: `Bearer ${apiKey}` },
    });

    if (error) {
      throw error;
    }
    expect(data.events).toBeDefined();
    expect(Array.isArray(data.events)).toBe(true);
    expect(
      data.nextCursor === null || typeof data.nextCursor === "string"
    ).toBe(true);
  });

  test("GET /webhooks/events returns 400 for invalid cursor", async () => {
    const { error } = await client.webhooks.events.get({
      query: { cursor: "invalid-cursor" },
      headers: { authorization: `Bearer ${apiKey}` },
    });

    expect(error?.status).toBe(400);
  });
});
