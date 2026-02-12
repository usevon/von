import { describe, expect, test } from "bun:test";
import { treaty } from "@elysiajs/eden";
import { Elysia } from "elysia";
import { createVonAuth } from "../../src/modules/auth/middleware";
import type { AuthApi, RedisTracking } from "../../src/modules/auth/model";

const noopRedis: RedisTracking = {
  set: async () => "OK",
  sadd: async () => 1,
};

const buildClient = (auth: AuthApi, scope = "read:webhooks") => {
  const app = new Elysia()
    .use(
      createVonAuth(
        { auth, redis: noopRedis },
        {
          useRateLimit: false,
        }
      )(scope)
    )
    .get("/protected", ({ organizationId, userId, scopes }) => ({
      organizationId,
      userId,
      scopes,
    }));

  return treaty(app);
};

describe("auth middleware", () => {
  test("returns 401 when no valid credentials are provided", async () => {
    const auth: AuthApi = {
      api: {
        verifyApiKey: async () => ({ valid: false }),
        getSession: async () => null,
      },
    };

    const client = buildClient(auth);
    const { error } = await client.protected.get();

    expect(error?.status).toBe(401);
    expect(error?.value).toEqual({
      error: "Please sign in or provide a valid API key.",
    });
  });

  test("returns 403 when API key lacks required scope", async () => {
    const auth: AuthApi = {
      api: {
        verifyApiKey: async () => ({
          valid: true,
          key: {
            id: "key_1",
            organizationId: "org_1",
            userId: "user_1",
            scopes: ["write:webhooks"],
          },
        }),
        getSession: async () => null,
      },
    };

    const client = buildClient(auth, "read:webhooks");
    const { error } = await client.protected.get({
      headers: {
        authorization: "Bearer von_dev_key",
      },
    });

    expect(error?.status).toBe(403);
    expect(error?.value).toEqual({
      error: "API key lacks required scope",
    });
  });

  test("allows request when API key has required scope", async () => {
    const auth: AuthApi = {
      api: {
        verifyApiKey: async () => ({
          valid: true,
          key: {
            id: "key_2",
            organizationId: "org_2",
            userId: "user_2",
            scopes: ["read:webhooks"],
          },
        }),
        getSession: async () => null,
      },
    };

    const client = buildClient(auth, "read:webhooks");
    const { data, error } = await client.protected.get({
      headers: {
        authorization: "Bearer von_dev_key",
      },
    });

    expect(error).toBeFalsy();
    expect(data).toEqual({
      organizationId: "org_2",
      userId: "user_2",
      scopes: ["read:webhooks"],
    });
  });
});
