import { beforeAll, describe, expect, test } from "bun:test";
import { treaty } from "@elysiajs/eden";
import type { App } from "../setup";

const TEST_ID = "550e8400-e29b-41d4-a716-446655440000";
const TEST_VERSION = "2024-06-01";

describe("API auth guards", () => {
  let client: ReturnType<typeof treaty<App>>;

  beforeAll(async () => {
    const setup = await import("../setup");
    client = treaty(setup.app);
  });

  const cases: [
    string,
    () => Promise<{ error?: { status?: number } | null }>,
  ][] = [
    [
      "POST /endpoints",
      () =>
        client.endpoints.post({
          url: "https://example.com/webhook",
          description: "Test endpoint",
        }),
    ],
    ["GET /endpoints", () => client.endpoints.get()],
    ["GET /endpoints/:id", () => client.endpoints({ id: TEST_ID }).get()],
    [
      "PATCH /endpoints/:id",
      () => client.endpoints({ id: TEST_ID }).patch({ status: "disabled" }),
    ],
    ["DELETE /endpoints/:id", () => client.endpoints({ id: TEST_ID }).delete()],
    [
      "POST /versions",
      () =>
        client.versions.post({
          version: TEST_VERSION,
          transforms: { "product.updated": { rename: { features: "items" } } },
        }),
    ],
    ["GET /versions", () => client.versions.get()],
    [
      "GET /versions/:version",
      () => client.versions({ version: TEST_VERSION }).get(),
    ],
    [
      "PATCH /versions/:version",
      () =>
        client
          .versions({ version: TEST_VERSION })
          .patch({
            transforms: {
              "product.updated": { rename: { features: "newItems" } },
            },
          }),
    ],
    [
      "DELETE /versions/:version",
      () => client.versions({ version: TEST_VERSION }).delete(),
    ],
    [
      "POST /webhooks",
      () =>
        client.webhooks.post({
          eventType: "user.created",
          payload: { id: "123" },
        }),
    ],
    ["GET /webhooks/events", () => client.webhooks.events.get()],
    [
      "GET /webhooks/events/:id",
      () => client.webhooks.events({ id: TEST_ID }).get(),
    ],
    ["GET /inbound", () => client.inbound.get()],
  ];

  for (const [name, run] of cases) {
    test(`${name} returns 401 without API key`, async () => {
      const { error } = await run();

      expect(error?.status).toBe(401);
    });
  }
});
