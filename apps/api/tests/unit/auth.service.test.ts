import { describe, expect, test } from "bun:test";
import type { AuthApi, RedisTracking } from "../../src/modules/auth/model";
import { resolveAuth, validateSession } from "../../src/modules/auth/service";

const createTrackingRedis = (): {
  redis: RedisTracking;
  setCalls: [string, string][];
  saddCalls: [string, string][];
} => {
  const setCalls: [string, string][] = [];
  const saddCalls: [string, string][] = [];

  return {
    redis: {
      set: (key, value) => {
        setCalls.push([key, value]);
        return Promise.resolve("OK");
      },
      sadd: (key, value) => {
        saddCalls.push([key, value]);
        return Promise.resolve(1);
      },
    },
    setCalls,
    saddCalls,
  };
};

describe("auth service", () => {
  test("resolveAuth returns API key identity and records last usage", async () => {
    const { redis, setCalls, saddCalls } = createTrackingRedis();
    let getSessionCalls = 0;

    const auth: AuthApi = {
      api: {
        verifyApiKey: ({ body }) => {
          expect(body.key).toBe("von_dev_testkey");
          return Promise.resolve({
            valid: true,
            key: {
              id: "key_123",
              organizationId: "org_123",
              userId: "user_123",
              scopes: ["read:webhooks"],
            },
          });
        },
        getSession: () => {
          getSessionCalls += 1;
          return Promise.resolve(null);
        },
      },
    };

    const result = await resolveAuth(auth, redis, {
      authorization: "Bearer von_dev_testkey",
    });

    expect(result).toEqual({
      organizationId: "org_123",
      userId: "user_123",
      scopes: ["read:webhooks"],
    });

    expect(getSessionCalls).toBe(0);
    expect(setCalls.length).toBe(1);
    expect(setCalls[0]?.[0]).toBe("api:lastUsed:key_123");
    expect(Number(setCalls[0]?.[1] ?? "0")).toBeGreaterThan(0);
    expect(saddCalls).toEqual([["api:lastUsed:dirty", "key_123"]]);
  });

  test("resolveAuth falls back to session when API key verification throws", async () => {
    const { redis } = createTrackingRedis();
    let getSessionCalls = 0;

    const auth: AuthApi = {
      api: {
        verifyApiKey: () => Promise.reject(new Error("invalid key")),
        getSession: () => {
          getSessionCalls += 1;
          return Promise.resolve({
            session: { activeOrganizationId: "org_session" },
            user: { id: "user_session" },
          });
        },
      },
    };

    const result = await resolveAuth(auth, redis, {
      authorization: "Bearer bad_key",
    });

    expect(result).toEqual({
      organizationId: "org_session",
      userId: "user_session",
      scopes: ["*"],
    });
    expect(getSessionCalls).toBe(1);
  });

  test("resolveAuth returns null when key and session are both invalid", async () => {
    const { redis } = createTrackingRedis();

    const auth: AuthApi = {
      api: {
        verifyApiKey: () => Promise.resolve({ valid: false }),
        getSession: () => Promise.resolve(null),
      },
    };

    const result = await resolveAuth(auth, redis, {
      authorization: "Bearer invalid_key",
    });

    expect(result).toBeNull();
  });

  test("resolveAuth uses session when no bearer token is provided", async () => {
    const { redis } = createTrackingRedis();
    let verifyCalls = 0;

    const auth: AuthApi = {
      api: {
        verifyApiKey: () => {
          verifyCalls += 1;
          return Promise.resolve({ valid: false });
        },
        getSession: () =>
          Promise.resolve({
            session: { activeOrganizationId: "org_cookie" },
            user: { id: "user_cookie" },
          }),
      },
    };

    const result = await resolveAuth(auth, redis, {
      cookie: "von.session=abc",
    });

    expect(verifyCalls).toBe(0);
    expect(result).toEqual({
      organizationId: "org_cookie",
      userId: "user_cookie",
      scopes: ["*"],
    });
  });

  test("validateSession returns active organization id", async () => {
    const auth: AuthApi = {
      api: {
        verifyApiKey: () => Promise.resolve({ valid: false }),
        getSession: () =>
          Promise.resolve({
            session: { activeOrganizationId: "org_789" },
          }),
      },
    };

    const result = await validateSession(auth, {
      cookie: "von.session=abc",
    });

    expect(result).toBe("org_789");
  });

  test("validateSession returns null when getSession throws", async () => {
    const auth: AuthApi = {
      api: {
        verifyApiKey: () => Promise.resolve({ valid: false }),
        getSession: () => Promise.reject(new Error("session unavailable")),
      },
    };

    const result = await validateSession(auth, {
      cookie: "von.session=abc",
    });

    expect(result).toBeNull();
  });
});
