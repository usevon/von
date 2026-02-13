import { describe, expect, test } from "bun:test";
import { client } from "../setup";
import { getApiKey } from "./setup";

describe.skipIf(!getApiKey())("Versions CRUD", () => {
  const apiKey = getApiKey() ?? "";
  const offset = Date.now() % 36_500;
  const testDate = new Date(2020, 0, 1 + offset);
  const testVersion = testDate.toISOString().split("T")[0];
  let createdVersion = false;

  test("POST /versions creates version", async () => {
    const { data, error } = await client.versions.post(
      {
        version: testVersion,
        transforms: {
          "product.updated": {
            rename: { features: "items" },
            remove: ["internalField"],
            defaults: { legacyField: null },
          },
        },
      },
      {
        headers: { authorization: `Bearer ${apiKey}` },
      }
    );

    if (error) {
      throw error;
    }
    expect(data.id).toBeDefined();
    expect(new Date(data.version).toISOString().split("T")[0]).toBe(
      testVersion
    );
    expect(data.transforms["product.updated"].rename).toEqual({
      features: "items",
    });
    createdVersion = true;
  });

  test("GET /versions returns list", async () => {
    const { data, error } = await client.versions.get({
      headers: { authorization: `Bearer ${apiKey}` },
    });

    if (error) {
      throw error;
    }
    expect(data.versions).toBeDefined();
    expect(Array.isArray(data.versions)).toBe(true);
    expect(
      data.nextCursor === null || typeof data.nextCursor === "string"
    ).toBe(true);
  });

  test("GET /versions/:version returns version", async () => {
    if (!createdVersion) {
      return;
    }

    const { data, error } = await client
      .versions({ version: testVersion })
      .get({
        headers: { authorization: `Bearer ${apiKey}` },
      });

    if (error) {
      throw error;
    }
    expect(new Date(data.version).toISOString().split("T")[0]).toBe(
      testVersion
    );
    expect(data.transforms["product.updated"]).toBeDefined();
  });

  test("PATCH /versions/:version updates version", async () => {
    if (!createdVersion) {
      return;
    }

    const { data, error } = await client
      .versions({ version: testVersion })
      .patch(
        {
          transforms: {
            "product.updated": {
              rename: { features: "newItems" },
            },
          },
        },
        {
          headers: { authorization: `Bearer ${apiKey}` },
        }
      );

    if (error) {
      throw error;
    }
    expect(data.transforms["product.updated"].rename).toEqual({
      features: "newItems",
    });
  });

  test("DELETE /versions/:version deletes version", async () => {
    if (!createdVersion) {
      return;
    }

    const { data, error } = await client
      .versions({ version: testVersion })
      .delete(null, {
        headers: { authorization: `Bearer ${apiKey}` },
      });

    if (error) {
      throw error;
    }
    expect(data.success).toBe(true);
    createdVersion = false;
  });
});

describe.skipIf(!getApiKey())("Endpoint with Version", () => {
  const apiKey = getApiKey() ?? "";
  const offset = (Date.now() + 18_250) % 36_500;
  const testDate = new Date(2020, 0, 1 + offset);
  const testVersion = testDate.toISOString().split("T")[0];
  let endpointId: string | null = null;

  test("create version for endpoint test", async () => {
    const { error } = await client.versions.post(
      {
        version: testVersion,
        transforms: {
          "order.created": {
            rename: { items: "lineItems" },
          },
        },
      },
      {
        headers: { authorization: `Bearer ${apiKey}` },
      }
    );
    if (error) {
      throw error;
    }
  });

  test("POST /endpoints with version creates endpoint", async () => {
    const { data, error } = await client.endpoints.post(
      {
        url: "https://example.com/webhook",
        description: "Versioned endpoint test",
        version: testVersion,
      },
      {
        headers: { authorization: `Bearer ${apiKey}` },
      }
    );

    if (error) {
      throw error;
    }
    expect(data.id).toBeDefined();
    expect(new Date(data.version).toISOString().split("T")[0]).toBe(
      testVersion
    );
    endpointId = data.id;
  });

  test("GET /endpoints/:id returns endpoint with version", async () => {
    if (!endpointId) {
      return;
    }

    const { data, error } = await client.endpoints({ id: endpointId }).get({
      headers: { authorization: `Bearer ${apiKey}` },
    });

    if (error) {
      throw error;
    }
    expect(new Date(data.version).toISOString().split("T")[0]).toBe(
      testVersion
    );
  });

  test("PATCH /endpoints/:id can update version", async () => {
    if (!endpointId) {
      return;
    }

    const { data, error } = await client.endpoints({ id: endpointId }).patch(
      { version: null },
      {
        headers: { authorization: `Bearer ${apiKey}` },
      }
    );

    if (error) {
      throw error;
    }
    expect(data.version).toBeNull();
  });

  test("cleanup: delete endpoint", async () => {
    if (!endpointId) {
      return;
    }
    await client.endpoints({ id: endpointId }).delete(null, {
      headers: { authorization: `Bearer ${apiKey}` },
    });
  });

  test("cleanup: delete version", async () => {
    await client.versions({ version: testVersion }).delete(null, {
      headers: { authorization: `Bearer ${apiKey}` },
    });
  });
});
