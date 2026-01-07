import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { betterAuth } from "better-auth/minimal";
import { bearer, organization } from "better-auth/plugins";
import { apiKey } from "@usevon/auth";
import { db } from "@usevon/db";
import { getRedisClient } from "@usevon/queue";
import { UnauthorizedError } from "@usevon/utils";
import { Elysia } from "elysia";

import { env } from "@/env";

const redis = getRedisClient();

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.TUNNEL_URL ?? `http://localhost:${env.PORT}`,
  plugins: [
    bearer(),
    organization(),
    apiKey({
      storage: "secondary-storage",
      fallbackToDatabase: true,
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
    }),
  ],
});

export const requireOrg = new Elysia({ name: "require-org" }).resolve(
  { as: "scoped" },
  async ({ headers }): Promise<{ organizationId: string; userId: string }> => {
    const authHeader = headers.authorization;

    if (authHeader?.startsWith("Bearer ")) {
      const rawKey = authHeader.slice(7);
      const result = await auth.api.verifyApiKey({ body: { key: rawKey } });

      if (result.valid && result.key?.organizationId) {
        return {
          organizationId: result.key.organizationId,
          userId: result.key.userId ?? "",
        };
      }
    }

    const data = await auth.api.getSession({
      headers: headers as HeadersInit,
    });

    if (data?.session?.activeOrganizationId) {
      return {
        organizationId: data.session.activeOrganizationId,
        userId: data.user?.id ?? "",
      };
    }

    throw new UnauthorizedError("Authentication required");
  }
);

export async function validateSession(
  headers: Record<string, string>
): Promise<string | null> {
  try {
    const session = await auth.api.getSession({
      headers: headers as HeadersInit,
    });
    return session?.session?.activeOrganizationId ?? null;
  } catch {
    return null;
  }
}
