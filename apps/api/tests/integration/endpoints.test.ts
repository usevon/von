import { describe, expect, test } from "bun:test";
import { client } from "../setup";
import { getApiKey } from "./setup";

const WHSEC_PREFIX_REGEX = /^whsec_/;

describe.skipIf(!getApiKey())("Endpoints CRUD", () => {
  const apiKey = getApiKey() ?? "";
  let createdEndpointId: string | null = null;

  test("POST /endpoints creates endpoint", async () => {
    const { data, error } = await client.endpoints.post(
      {
        url: "https://example.com/webhook",
        description: "Integration test endpoint",
      },
      {
        headers: { authorization: `Bearer ${apiKey}` },
      }
    );

    if (error) {
      throw error;
    }
    expect(data.id).toBeDefined();
    expect(data.url).toBe("https://example.com/webhook");
    expect(data.secret).toMatch(WHSEC_PREFIX_REGEX);
    createdEndpointId = data.id;
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
    expect(data.total).toBeGreaterThanOrEqual(0);
  });

  test("GET /endpoints/:id returns endpoint", async () => {
    if (!createdEndpointId) {
      return;
    }

    const { data, error } = await client
      .endpoints({ id: createdEndpointId })
      .get({
        headers: { authorization: `Bearer ${apiKey}` },
      });

    if (error) {
      throw error;
    }
    expect(data.id).toBe(createdEndpointId);
  });

  test("PATCH /endpoints/:id updates endpoint", async () => {
    if (!createdEndpointId) {
      return;
    }

    const { data, error } = await client
      .endpoints({ id: createdEndpointId })
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
  });

  test("DELETE /endpoints/:id deletes endpoint", async () => {
    if (!createdEndpointId) {
      return;
    }

    const { data, error } = await client
      .endpoints({ id: createdEndpointId })
      .delete(null, {
        headers: { authorization: `Bearer ${apiKey}` },
      });

    if (error) {
      throw error;
    }
    expect(data.success).toBe(true);
    createdEndpointId = null;
  });
});
