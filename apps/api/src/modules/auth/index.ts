import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { betterAuth } from "better-auth/minimal";
import { bearer, organization } from "better-auth/plugins";
import { apiKey } from "@usevon/auth";
import { db } from "@usevon/db";
import { getRedisClient } from "@usevon/queue";
import { BadRequestError } from "@usevon/utils";
import { Elysia } from "elysia";

import { env } from "@/env";
import { userRateLimit } from "@/lib/rate-limit";

const redis = getRedisClient();

const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),
  secret: env.BETTER_AUTH_SECRET,
  plugins: [
    bearer(),
    organization(),
    apiKey({
      storage: "secondary-storage",
      fallbackToDatabase: true,
      signingSecret: env.API_KEY_SIGNING_SECRET,
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

export const requireOrg = new Elysia({ name: "require-org" })
  .use(userRateLimit({ windowMs: 60_000, max: 200, keyPrefix: "rl:auth" }))
  .resolve({ as: "scoped" }, async ({ headers }): Promise<{ organizationId: string; userId: string }> => {
    const authHeader = headers.authorization;

    if (authHeader?.startsWith("Bearer ")) {
      const rawKey = authHeader.slice(7);
      const result = await auth.api.verifyApiKey({
        body: { key: rawKey },
      });

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

    throw new BadRequestError("Authentication required");
  });

export { auth };
