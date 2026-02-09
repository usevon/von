import { describe, expect, test } from "bun:test";
import { client } from "../setup";
import { getApiKey } from "./setup";

describe.skipIf(!getApiKey())("Tunnel", () => {
  const apiKey = getApiKey() ?? "";
  const headers = { authorization: `Bearer ${apiKey}` };
  let tunnelId: string | null = null;
  let tunnelSecret: string | null = null;

  describe("Registration", () => {
    test("POST /register creates a new tunnel", async () => {
      const { data, error } = await client.register.post(
        { port: 54_321 },
        { headers }
      );

      if (error) {
        throw error;
      }
      expect(data.tunnelId).toBeDefined();
      expect(data.secret).toBeDefined();
      expect(typeof data.tunnelId).toBe("string");
      expect(typeof data.secret).toBe("string");
      tunnelId = data.tunnelId;
      tunnelSecret = data.secret;
    });

    test("POST /register returns same tunnel for same port", async () => {
      const { data, error } = await client.register.post(
        { port: 54_321 },
        { headers }
      );

      if (error) {
        throw error;
      }
      expect(data.tunnelId).toBe(tunnelId);
      expect(data.secret).toBe(tunnelSecret);
    });

    test("POST /register rejects invalid port", async () => {
      const { error } = await client.register.post({ port: 0 }, { headers });

      expect(error).toBeDefined();
    });

    test("POST /register returns 401 without auth", async () => {
      const { error } = await client.register.post({ port: 3000 });

      expect(error).toBeDefined();
      expect(error?.status).toBe(401);
    });
  });

  describe("Secret rotation", () => {
    test("POST /rotate/:tunnelId rotates the secret", async () => {
      if (!tunnelId) {
        return;
      }

      const { data, error } = await client
        .rotate({ tunnelId })
        .post(null, { headers });

      if (error) {
        throw error;
      }
      expect(data.secret).toBeDefined();
      expect(data.secret).not.toBe(tunnelSecret);
      tunnelSecret = data.secret;
    });

    test("POST /rotate/:tunnelId returns 404 for unknown tunnel", async () => {
      const { error } = await client
        .rotate({ tunnelId: "nonexistent-tunnel-id" })
        .post(null, { headers });

      expect(error).toBeDefined();
      expect(error?.status).toBe(404);
    });

    test("POST /rotate/:tunnelId returns 401 without auth", async () => {
      if (!tunnelId) {
        return;
      }

      const { error } = await client.rotate({ tunnelId }).post(null);

      expect(error).toBeDefined();
      expect(error?.status).toBe(401);
    });
  });

  describe("Active tunnels", () => {
    test("GET /tunnels returns active tunnel list", async () => {
      const { data, error } = await client.tunnels.get({ headers });

      if (error) {
        throw error;
      }
      expect(data.tunnels).toBeDefined();
      expect(Array.isArray(data.tunnels)).toBe(true);
    });

    test("GET /tunnels returns 401 without auth", async () => {
      const { error } = await client.tunnels.get();

      expect(error).toBeDefined();
      expect(error?.status).toBe(401);
    });
  });

  describe("Proxy", () => {
    test("returns 401 for invalid tunnel secret", async () => {
      const { error } = await client.t["fake-id-wrong-secret"].get();

      expect(error).toBeDefined();
      expect(error?.status).toBe(401);
    });

    test("returns 502 for valid secret but no WebSocket connection", async () => {
      if (!(tunnelId && tunnelSecret)) {
        return;
      }

      const { error } = await client.t[`${tunnelId}-${tunnelSecret}`].get();

      // The tunnel is registered but no CLI is connected via WebSocket
      expect(error).toBeDefined();
      expect(error?.status).toBe(502);
    });
  });
});
