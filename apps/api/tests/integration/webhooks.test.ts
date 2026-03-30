import { describe, expect, test } from "bun:test";
import { client } from "../setup";
import { getApiKey } from "./setup";

const apiKey = getApiKey();
const INVALID_CURSOR_MESSAGE = "Invalid cursor";

const tamperCursorSignature = (cursor: string): string => {
  const parts = cursor.split(".");
  const signature = parts[5];
  if (!signature) {
    return `${cursor}a`;
  }

  const replacement = signature.startsWith("a") ? "b" : "a";
  parts[5] = `${replacement}${signature.slice(1)}`;
  return parts.join(".");
};

describe.skipIf(!apiKey)("Webhooks", () => {
  const endpointIdsToCleanup: string[] = [];

  const createEndpoint = async (suffix: string) => {
    const { data, error } = await client.endpoints.post(
      {
        url: `https://example.com/webhook/${suffix}`,
      },
      {
        headers: { authorization: `Bearer ${apiKey}` },
      }
    );

    if (error) {
      throw error;
    }

    endpointIdsToCleanup.push(data.id);
    return data.id;
  };

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

    expect(Number(error?.status)).toBe(400);
  });

  test("GET /webhooks/deliveries/:id/attempts returns delivery attempts", async () => {
    const endpointId = await createEndpoint(`attempts-${Date.now()}`);

    const created = await client.webhooks.post(
      {
        eventType: "attempts.test",
        payload: { ok: true },
        endpointIds: [endpointId],
      },
      {
        headers: { authorization: `Bearer ${apiKey}` },
      }
    );

    if (created.error) {
      throw created.error;
    }

    // Wait for event buffer to flush to Postgres
    await new Promise((r) => setTimeout(r, 100));

    const deliveries = await client.webhooks
      .events({ id: created.data.id })
      .deliveries.get({
        query: { limit: 1 },
        headers: { authorization: `Bearer ${apiKey}` },
      });

    if (deliveries.error) {
      throw deliveries.error;
    }

    const targetDelivery = deliveries.data.deliveries[0];
    if (!targetDelivery) {
      throw new Error("Expected at least one delivery");
    }

    const attempts = await client.webhooks
      .deliveries({ id: targetDelivery.id })
      .attempts.get({
        query: { sort: "asc" },
        headers: { authorization: `Bearer ${apiKey}` },
      });

    if (attempts.error) {
      throw attempts.error;
    }

    expect(Array.isArray(attempts.data.attempts)).toBe(true);
    expect(
      attempts.data.nextCursor === null ||
        typeof attempts.data.nextCursor === "string"
    ).toBe(true);
  });

  test("GET /webhooks/deliveries/:id/attempts returns 400 for invalid cursor", async () => {
    const endpointId = await createEndpoint(`attempts-cursor-${Date.now()}`);

    const created = await client.webhooks.post(
      {
        eventType: "attempts.cursor",
        payload: { ok: true },
        endpointIds: [endpointId],
      },
      {
        headers: { authorization: `Bearer ${apiKey}` },
      }
    );

    if (created.error) {
      throw created.error;
    }

    // Wait for event buffer to flush to Postgres
    await new Promise((r) => setTimeout(r, 100));

    const deliveries = await client.webhooks
      .events({ id: created.data.id })
      .deliveries.get({
        query: { limit: 1 },
        headers: { authorization: `Bearer ${apiKey}` },
      });

    if (deliveries.error) {
      throw deliveries.error;
    }

    const targetDelivery = deliveries.data.deliveries[0];
    if (!targetDelivery) {
      throw new Error("Expected at least one delivery");
    }

    const { error } = await client.webhooks
      .deliveries({ id: targetDelivery.id })
      .attempts.get({
        query: { limit: 1, cursor: tamperCursorSignature("invalid-cursor") },
        headers: { authorization: `Bearer ${apiKey}` },
      });

    expect(Number(error?.status)).toBe(400);
    expect(error?.value).toMatchObject({ error: INVALID_CURSOR_MESSAGE });
  });

  test("cleanup: delete remaining endpoints", async () => {
    for (const endpointId of [...endpointIdsToCleanup]) {
      const { error } = await client
        .endpoints({ id: endpointId })
        .delete(null, {
          headers: { authorization: `Bearer ${apiKey}` },
        });

      if (error && error.status !== 404) {
        throw error;
      }
    }

    endpointIdsToCleanup.length = 0;
    expect(endpointIdsToCleanup.length).toBe(0);
  });
});
