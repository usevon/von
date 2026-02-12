import {
  betterAuth,
  drizzleAdapter,
  hasScope,
  parseScopes,
} from "@usevon/auth";
import { db } from "@usevon/db";
import { PasswordResetEmail, render } from "@usevon/email";
import { getRedisClient } from "@usevon/queue";

import { Elysia } from "elysia";

import { env } from "@/env";
import { rateLimit } from "@/lib/rate-limit";
import { resendClient } from "@/lib/resend";
import { authDatabaseHooks, buildAuthPlugins } from "@/modules/auth/plugins";
import { buildSocialProviders } from "@/modules/auth/providers";
import { createSecondaryStorage } from "@/modules/auth/storage";

const redis = getRedisClient();
const secondaryStorage = createSecondaryStorage(redis);

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
  plugins: buildAuthPlugins(secondaryStorage),
  databaseHooks: authDatabaseHooks,
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
