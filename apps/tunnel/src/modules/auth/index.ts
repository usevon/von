import { createAuth, type Session, type User } from "@usevon/auth";
import { db } from "@usevon/db";
import { getRedisClient } from "@usevon/queue";
import { UnauthorizedError } from "@usevon/utils";
import { Elysia } from "elysia";
import { env } from "@/env";

const redis = getRedisClient();

export const betterAuth = createAuth(db, {
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.TUNNEL_URL ?? `http://localhost:${env.PORT}`,
  secondaryStorage: {
    get: async (key) => await redis.get(key),
    set: async (key, value, ttl) => {
      if (ttl) {
        await redis.setex(key, ttl, value);
      } else {
        await redis.set(key, value);
      }
    },
    delete: async (key) => {
      await redis.del(key);
    },
  },
});

export const withApiKey = new Elysia({ name: "api-key-auth" }).resolve(
  { as: "scoped" },
  async ({ headers }) => {
    const authHeader = headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      throw new UnauthorizedError("Invalid API key.");
    }
    const rawKey = authHeader.slice(7);

    const result = await betterAuth.api.verifyApiKey({ body: { key: rawKey } });
    if (!result.valid) {
      throw new UnauthorizedError("Invalid API key.");
    }

    const organizationId = result.key?.organizationId;
    if (!organizationId) {
      throw new UnauthorizedError("Invalid API key.");
    }

    return {
      apiKey: result.key,
      organizationId,
      userId: result.key?.userId ?? "",
    };
  }
);

export const withSession = new Elysia({ name: "session-auth" }).resolve(
  { as: "scoped" },
  async ({
    headers,
  }): Promise<{
    user: User;
    session: Session["session"];
    organizationId: string | null;
    userId: string;
  }> => {
    const data = await betterAuth.api.getSession({
      headers: headers as HeadersInit,
    });
    if (!data) {
      throw new UnauthorizedError("Please sign in.");
    }

    const { session, user } = data;

    return {
      user,
      session,
      organizationId: session?.activeOrganizationId ?? null,
      userId: user?.id ?? "",
    };
  }
);
