import { betterAuth, drizzleAdapter } from "@usevon/auth";
import { db } from "@usevon/db";
import { PasswordResetEmail, render } from "@usevon/email";
import { getRedisClient } from "@usevon/queue";

import { env } from "@/env";
import { resendClient } from "@/lib/resend";
import { createVonAuth } from "@/modules/auth/middleware";
import { authDatabaseHooks, buildAuthPlugins } from "@/modules/auth/plugins";
import { buildSocialProviders } from "@/modules/auth/providers";
import { validateSession as validateAuthSession } from "@/modules/auth/service";
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

export const vonAuth = createVonAuth(
  { auth, redis },
  {
    rateLimitFailOpen: env.NODE_ENV !== "production",
  }
);

export async function validateSession(
  headers: Record<string, string>
): Promise<string | null> {
  return validateAuthSession(auth, headers);
}

export { auth };
