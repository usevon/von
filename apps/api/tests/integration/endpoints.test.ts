import { describe, expect, test } from "bun:test";
import { client } from "../setup";
import { getApiKey } from "./setup";

const WHSEC_PREFIX_REGEX = /^whsec_/;
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

describe.skipIf(!getApiKey())("Endpoints CRUD", () => {
  const apiKey = getApiKey() ?? "";
  let primaryEndpointId: string | null = null;
  const endpointIdsToCleanup: string[] = [];

  const trackEndpoint = (id: string) => {
    endpointIdsToCleanup.push(id);
  };

  const untrackEndpoint = (id: string) => {
    const idx = endpointIdsToCleanup.indexOf(id);
    if (idx >= 0) {
      endpointIdsToCleanup.splice(idx, 1);
    }
  };

  const createTestEndpoint = async (suffix: string) => {
    const { data, error } = await client.endpoints.post(
      {
        url: `https://example.com/webhook/${suffix}`,
        description: `Integration test endpoint ${suffix}`,
      },
      {
        headers: { authorization: `Bearer ${apiKey}` },
      }
    );

    if (error) {
      throw error;
    }

    trackEndpoint(data.id);
    return data;
  };

  test("POST /endpoints creates endpoint", async () => {
    const data = await createTestEndpoint("primary");

    expect(data.id).toBeDefined();
    expect(data.url).toBe("https://example.com/webhook/primary");
    expect(data.secret).toMatch(WHSEC_PREFIX_REGEX);
    primaryEndpointId = data.id;
  });

  test("GET /endpoints returns list", async () => {
    const { data, error } = await client.endpoints.get({
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
    if (data.endpoints[0]) {
      expect("secret" in data.endpoints[0]).toBe(false);
    }
  });

  test("GET /endpoints returns 400 for tampered cursor", async () => {
    await createTestEndpoint(`cursor-a-${Date.now()}`);
    await createTestEndpoint(`cursor-b-${Date.now()}`);

    const firstPage = await client.endpoints.get({
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

    const { error } = await client.endpoints.get({
      query: { limit: 1, cursor: tamperCursorSignature(cursor) },
      headers: { authorization: `Bearer ${apiKey}` },
    });

    expect(error?.status).toBe(400);
    expect(error?.value).toMatchObject({ error: INVALID_CURSOR_MESSAGE });
  });

  test("GET /endpoints/:id returns endpoint", async () => {
    if (!primaryEndpointId) {
      return;
    }

    const { data, error } = await client
      .endpoints({ id: primaryEndpointId })
      .get({
        headers: { authorization: `Bearer ${apiKey}` },
      });

    if (error) {
      throw error;
    }
    expect(data.id).toBe(primaryEndpointId);
    expect("secret" in data).toBe(false);
  });

  test("PATCH /endpoints/:id updates endpoint", async () => {
    if (!primaryEndpointId) {
      return;
    }

    const { data, error } = await client
      .endpoints({ id: primaryEndpointId })
      .patch(
        { status: "disabled" },
        {
          headers: { authorization: `Bearer ${apiKey}` },
        }
      );

    if (error) {
      throw error;
    }
    expect(data.status).toBe("disabled");
    expect("secret" in data).toBe(false);
  });

  test("DELETE /endpoints/:id deletes endpoint", async () => {
    if (!primaryEndpointId) {
      return;
    }

    const { data, error } = await client
      .endpoints({ id: primaryEndpointId })
      .delete(null, {
        headers: { authorization: `Bearer ${apiKey}` },
      });

    if (error) {
      throw error;
    }
    expect(data.success).toBe(true);
    untrackEndpoint(primaryEndpointId);
    primaryEndpointId = null;
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

      untrackEndpoint(endpointId);
    }

    expect(endpointIdsToCleanup.length).toBe(0);
  });
});
