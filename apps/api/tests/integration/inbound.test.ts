import { describe, expect, test } from "bun:test";
import { tamperCursorSignature } from "../helpers";
import { client } from "../setup";
import { getApiKey } from "./setup";

const apiKey = getApiKey();
const INVALID_CURSOR_MESSAGE = "Invalid cursor";

describe.skipIf(!apiKey)("Inbound endpoints", () => {
  let primaryInboundEndpointId: string | null = null;
  const inboundEndpointIdsToCleanup: string[] = [];

  const trackInboundEndpoint = (id: string) => {
    inboundEndpointIdsToCleanup.push(id);
  };

  const untrackInboundEndpoint = (id: string) => {
    const idx = inboundEndpointIdsToCleanup.indexOf(id);
    if (idx >= 0) {
      inboundEndpointIdsToCleanup.splice(idx, 1);
    }
  };

  const createInboundEndpoint = async (suffix: string) => {
    const { data, error } = await client.inbound.post(
      {
        name: `Integration inbound ${suffix}`,
        provider: "stripe",
        forwardUrl: `https://example.com/inbound-webhook/${suffix}`,
      },
      {
        headers: { authorization: `Bearer ${apiKey}` },
      }
    );

    if (error) {
      throw error;
    }

    trackInboundEndpoint(data.id);
    return data;
  };

  test("POST /inbound creates inbound endpoint", async () => {
    const data = await createInboundEndpoint("primary");

    expect(data.id).toBeDefined();
    expect(data.forwardUrl).toBe("https://example.com/inbound-webhook/primary");
    expect(data.maxAttempts).toBe(4);
    expect(data.timeoutMs).toBe(30_000);
    primaryInboundEndpointId = data.id;
  });

  test("PATCH /inbound/:id updates retry settings", async () => {
    if (!primaryInboundEndpointId) {
      return;
    }

    const { data, error } = await client
      .inbound({ id: primaryInboundEndpointId })
      .patch(
        {
          maxAttempts: 6,
          timeoutMs: 45_000,
        },
        {
          headers: { authorization: `Bearer ${apiKey}` },
        }
      );

    if (error) {
      throw error;
    }

    expect(data.maxAttempts).toBe(6);
    expect(data.timeoutMs).toBe(45_000);
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
    expect(
      data.nextCursor === null || typeof data.nextCursor === "string"
    ).toBe(true);
  });

  test("GET /inbound returns 400 for tampered cursor", async () => {
    await createInboundEndpoint(`cursor-a-${Date.now()}`);
    await createInboundEndpoint(`cursor-b-${Date.now()}`);

    const firstPage = await client.inbound.get({
      query: { limit: 1 },
      headers: { authorization: `Bearer ${apiKey}` },
    });

    if (firstPage.error) {
      throw firstPage.error;
    }

    const cursor = firstPage.data.nextCursor;
    if (!cursor) {
      throw new Error("Expected nextCursor for tamper test");
    }

    const { error } = await client.inbound.get({
      query: { limit: 1, cursor: tamperCursorSignature(cursor) },
      headers: { authorization: `Bearer ${apiKey}` },
    });

    expect((error?.status as number | undefined) ?? 0).toBe(400);
    expect(error?.value).toMatchObject({ error: INVALID_CURSOR_MESSAGE });
  });

  test("DELETE /inbound/:id cleans up", async () => {
    if (!primaryInboundEndpointId) {
      return;
    }

    const { data, error } = await client
      .inbound({ id: primaryInboundEndpointId })
      .delete(null, {
        headers: { authorization: `Bearer ${apiKey}` },
      });

    if (error) {
      throw error;
    }
    expect(data.success).toBe(true);
    untrackInboundEndpoint(primaryInboundEndpointId);
    primaryInboundEndpointId = null;
  });

  test("cleanup: delete remaining inbound endpoints", async () => {
    for (const inboundEndpointId of [...inboundEndpointIdsToCleanup]) {
      const { error } = await client
        .inbound({ id: inboundEndpointId })
        .delete(null, {
          headers: { authorization: `Bearer ${apiKey}` },
        });

      if (error && error.status !== 404) {
        throw error;
      }

      untrackInboundEndpoint(inboundEndpointId);
    }

    expect(inboundEndpointIdsToCleanup.length).toBe(0);
  });
});
