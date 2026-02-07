import {
  apiKey,
  bearer,
  betterAuth,
  deviceAuthorization,
  drizzleAdapter,
  organization,
} from "@usevon/auth";
import { db, eq } from "@usevon/db";
import * as schema from "@usevon/db/schema";
import { getRedisClient } from "@usevon/queue";
import { UnauthorizedError } from "@usevon/utils";
import { Elysia } from "elysia";

import { env } from "@/env";
import { userRateLimit } from "@/lib/rate-limit";

const redis = getRedisClient();

type SessionInsert = typeof schema.session.$inferInsert;

function buildSocialProviders() {
  const providers: Record<string, { clientId: string; clientSecret: string }> = {};

  if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
    providers.google = {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    };
  }

  if (env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET) {
    providers.github = {
      clientId: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
    };
  }

  if (Object.keys(providers).length === 0) {
    if (env.NODE_ENV === "development") {
      console.log("[Auth] No OAuth providers configured — social login disabled in development");
    }
    return undefined;
  }

  return providers;
}

const socialProviders = buildSocialProviders();

const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL ?? `http://localhost:${env.PORT}`,
  trustedOrigins: [env.DASHBOARD_URL ?? "http://localhost:3001"],
  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
    storage: "memory",
  },
  ...(socialProviders && { socialProviders }),
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url }) => {
      // TODO: Integrate email provider (Resend, SendGrid, etc.)
      console.log(`[Auth] Password reset requested for ${user.email}: ${url}`);
    },
  },
  user: {
    deleteUser: {
      enabled: true,
    },
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },
  experimental: {
    joins: true,
  },
  advanced: {
    cookiePrefix: "von",
    database: {
      generateId: () => crypto.randomUUID(),
    },
  },
  plugins: [
    bearer(),
    organization({
      organizationHooks: {
        afterAddMember: async ({ member }) => {
          await db
            .update(schema.session)
            .set({ activeOrganizationId: member.organizationId })
            .where(eq(schema.session.userId, member.userId));
        },
      },
    }),
    ...(env.API_KEY_SIGNING_SECRET
      ? [
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
        ]
      : []),
    deviceAuthorization({
      verificationUri: "/device",
      expiresIn: "30m",
      interval: "5s",
    }),
  ],
  databaseHooks: {
    user: {
      delete: {
        before: async (user) => {
          const memberships = await db
            .select({ organizationId: schema.member.organizationId })
            .from(schema.member)
            .where(eq(schema.member.userId, user.id));

          for (const { organizationId } of memberships) {
            const memberCount = await db
              .select({ id: schema.member.id })
              .from(schema.member)
              .where(eq(schema.member.organizationId, organizationId));

            if (memberCount.length === 1) {
              await db
                .delete(schema.organization)
                .where(eq(schema.organization.id, organizationId));
            }
          }
        },
      },
    },
    session: {
      create: {
        before: async (session) => {
          const s = session as SessionInsert;
          if (s.activeOrganizationId) {
            return { data: session };
          }
          const [firstMember] = await db
            .select({ organizationId: schema.member.organizationId })
            .from(schema.member)
            .where(eq(schema.member.userId, s.userId))
            .limit(1);

          if (firstMember) {
            return {
              data: {
                ...session,
                activeOrganizationId: firstMember.organizationId,
              },
            };
          }
          return { data: session };
        },
      },
    },
  },
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

    throw new UnauthorizedError("Please sign in or provide a valid API key.");
  });

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

export { auth };
