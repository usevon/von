import { describe, expect, test } from "bun:test";
import { client } from "../setup";

const TEST_ID = "550e8400-e29b-41d4-a716-446655440000";
const TEST_VERSION = "2024-06-01";

type UnauthorizedCase = {
  name: string;
  run: () => Promise<{ error?: { status?: number } | null }>;
};

const unauthorizedCases: UnauthorizedCase[] = [
  {
    name: "POST /endpoints",
    run: () =>
      client.endpoints.post({
        url: "https://example.com/webhook",
        description: "Test endpoint",
      }),
  },
  {
    name: "GET /endpoints",
    run: () => client.endpoints.get(),
  },
  {
    name: "GET /endpoints/:id",
    run: () => client.endpoints({ id: TEST_ID }).get(),
  },
  {
    name: "PATCH /endpoints/:id",
    run: () => client.endpoints({ id: TEST_ID }).patch({ status: "disabled" }),
  },
  {
    name: "DELETE /endpoints/:id",
    run: () => client.endpoints({ id: TEST_ID }).delete(),
  },
  {
    name: "POST /versions",
    run: () =>
      client.versions.post({
        version: TEST_VERSION,
        transforms: {
          "product.updated": {
            rename: { features: "items" },
          },
        },
      }),
  },
  {
    name: "GET /versions",
    run: () => client.versions.get(),
  },
  {
    name: "GET /versions/:version",
    run: () => client.versions({ version: TEST_VERSION }).get(),
  },
  {
    name: "PATCH /versions/:version",
    run: () =>
      client.versions({ version: TEST_VERSION }).patch({
        transforms: {
          "product.updated": {
            rename: { features: "newItems" },
          },
        },
      }),
  },
  {
    name: "DELETE /versions/:version",
    run: () => client.versions({ version: TEST_VERSION }).delete(),
  },
  {
    name: "POST /webhooks",
    run: () =>
      client.webhooks.post({
        eventType: "user.created",
        payload: { id: "123" },
      }),
  },
  {
    name: "GET /webhooks/events",
    run: () => client.webhooks.events.get(),
  },
  {
    name: "GET /webhooks/events/:id",
    run: () => client.webhooks.events({ id: TEST_ID }).get(),
  },
  {
    name: "GET /inbound",
    run: () => client.inbound.get(),
  },
];

describe("API auth guards", () => {
  for (const unauthorizedCase of unauthorizedCases) {
    test(`${unauthorizedCase.name} returns 401 without API key`, async () => {
      const { error } = await unauthorizedCase.run();

      expect(error?.status).toBe(401);
    });
  }
});
