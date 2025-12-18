import { describe, expect, test } from "bun:test";
import { client } from "../setup";
import { getApiKey } from "./setup";

const apiKey = getApiKey();

describe.skipIf(!apiKey)("Inbound endpoints", () => {
  let inboundEndpointId: string | null = null;

  test("POST /inbound creates inbound endpoint", async () => {
    const { data, error } = await client.inbound.post(
      {
        name: "Integration test inbound",
        provider: "stripe",
        forwardUrl: "https://example.com/inbound-webhook",
      },
      {
        headers: { authorization: `Bearer ${apiKey}` },
      }
    );

    if (error) {
      throw error;
    }
    expect(data.id).toBeDefined();
    expect(data.forwardUrl).toBe("https://example.com/inbound-webhook");
    inboundEndpointId = data.id;
  });

  test("GET /inbound returns list", async () => {
    const { data, error } = await client.inbound.get({
      headers: { authorization: `Bearer ${apiKey}` },
    });

    if (error) {
      throw error;
    }
    expect(data.endpoints).toBeDefined();
    expect(Array.isArray(data.endpoints)).toBe(true);
  });

  test("DELETE /inbound/:id cleans up", async () => {
    if (!inboundEndpointId) {
      return;
    }

    const { data, error } = await client
      .inbound({ id: inboundEndpointId })
      .delete(null, {
        headers: { authorization: `Bearer ${apiKey}` },
      });

    if (error) {
      throw error;
    }
    expect(data.success).toBe(true);
  });
});
