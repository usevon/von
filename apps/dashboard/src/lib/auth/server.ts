import { betterAuth, drizzleAdapter } from "@usevon/auth";
import { db } from "@usevon/db";
import { PasswordResetEmail, render, VerificationEmail } from "@usevon/email";
import { getRedisClient } from "@usevon/queue";

import { env } from "@/env";
import { authDatabaseHooks, buildAuthPlugins } from "@/lib/auth/plugins";
import { buildSocialProviders } from "@/lib/auth/providers";
import { createSecondaryStorage } from "@/lib/auth/storage";
import { log } from "@/lib/logger";
import { resendClient } from "@/lib/resend";

const redis = getRedisClient();
const secondaryStorage = createSecondaryStorage(redis);

const socialProviders = buildSocialProviders();

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),
  secrets: [{ version: 1, value: env.BETTER_AUTH_SECRET }],
  baseURL: env.BETTER_AUTH_URL ?? "http://localhost:3001",
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
    requireEmailVerification: true,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      log.info({ to: user.email, url }, "[Auth] Password reset requested");

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
  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      log.info({ to: user.email, url }, "[Auth] Verification email requested");

      const html = await render(
        VerificationEmail({
          email: user.email,
          verifyLink: url,
          requestTime: new Date().toLocaleString("en-US", {
            dateStyle: "long",
            timeStyle: "short",
          }),
        })
      );

      await resendClient.sendEmail({
        to: user.email,
        subject: "Verify your email address",
        html,
      });
    },
  },
  account: {
    encryptOAuthTokens: true,
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
