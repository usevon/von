import {
  apiKey,
  bearer,
  betterAuth,
  deviceAuthorization,
  drizzleAdapter,
  emailHarmony,
  hasScope,
  organization,
  parseScopes,
} from "@usevon/auth";
import { db, eq } from "@usevon/db";
import * as schema from "@usevon/db/schema";
import { PasswordResetEmail, render } from "@usevon/email";
import { getRedisClient } from "@usevon/queue";

import { APIError } from "better-auth/api";
import { Elysia } from "elysia";
import mailchecker from "mailchecker";
import isEmail from "validator/es/lib/isEmail.js";

import { env } from "@/env";
import { rateLimit } from "@/lib/rate-limit";
import { resendClient } from "@/lib/resend";
import { createSecondaryStorage } from "@/modules/auth/storage";

const redis = getRedisClient();
const secondaryStorage = createSecondaryStorage(redis);

type SessionInsert = typeof schema.session.$inferInsert;

function buildSocialProviders() {
  const providers: Record<string, { clientId: string; clientSecret: string }> =
    {};

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
      console.log(
        "[Auth] No OAuth providers configured — social login disabled in development"
      );
    }
    return;
  }

  return providers;
}

const socialProviders = buildSocialProviders();

const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL ?? `http://localhost:${env.PORT}`,
  trustedOrigins: [env.DASHBOARD_URL ?? "http://localhost:3001"],
  secondaryStorage,
  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
    storage: "secondary-storage",
  },
  ...(socialProviders && { socialProviders }),
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url }) => {
      const html = await render(
        PasswordResetEmail({
          email: user.email,
          resetLink: url,
          requestTime: new Date().toLocaleString("en-US", {
            dateStyle: "long",
            timeStyle: "short",
          }),
        })
      );

      await resendClient.sendEmail({
        to: user.email,
        subject: "Reset your Von password",
        html,
      });
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
    emailHarmony({
      validator: (email) => {
        if (!isEmail(email)) {
          return false;
        }
        if (!mailchecker.isValid(email)) {
          throw new APIError("BAD_REQUEST", {
            message: "Disposable email addresses are not allowed",
          });
        }
        return true;
      },
    }),
    bearer(),
    organization({
      schema: {
        organization: {
          additionalFields: {
            plan: {
              type: "string",
              required: false,
              defaultValue: "hobby",
              input: false,
            },
          },
        },
      },
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
            secondaryStorage,
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

async function resolveAuth(
  headers: Record<string, string | undefined>
): Promise<{
  organizationId: string;
  userId: string;
  scopes: string[];
} | null> {
  const authHeader = headers.authorization;

  if (authHeader?.startsWith("Bearer ")) {
    try {
      const rawKey = authHeader.slice(7);
      const result = await auth.api.verifyApiKey({
        body: { key: rawKey },
      });

      if (result.valid && result.key?.organizationId) {
        const keyId = result.key.id;
        const now = Math.floor(Date.now() / 1000);
        redis.set(`api:lastUsed:${keyId}`, String(now));
        redis.sadd("api:lastUsed:dirty", keyId);

        return {
          organizationId: result.key.organizationId,
          userId: result.key.userId ?? "",
          scopes: parseScopes(
            (result.key as Record<string, unknown>).scopes as
              | string
              | string[]
              | null
          ),
        };
      }
    } catch {
      // Invalid key — fall through to session check
    }
  }

  try {
    const data = await auth.api.getSession({
      headers: headers as HeadersInit,
    });
    if (data?.session?.activeOrganizationId) {
      return {
        organizationId: data.session.activeOrganizationId,
        userId: data.user?.id ?? "",
        scopes: ["*"],
      };
    }
  } catch {
    // No valid session
  }

  return null;
}

export const vonAuth = (scope: string) =>
  new Elysia({ name: `auth:${scope}` })
    .use(
      rateLimit({
        windowMs: 60_000,
        max: 200,
        keyPrefix: "rl:auth",
        failOpen: env.NODE_ENV !== "production",
      })
    )
    .resolve({ as: "scoped" }, async ({ headers, status }) => {
      const result = await resolveAuth(headers);
      if (!result) {
        return status(401, {
          error: "Please sign in or provide a valid API key.",
        });
      }
      if (!hasScope(result.scopes, scope)) {
        return status(403, { error: "API key lacks required scope" });
      }
      return result;
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
