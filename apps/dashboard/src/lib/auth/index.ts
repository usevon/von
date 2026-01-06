import { createAuth } from "@usevon/auth";
import { db } from "@usevon/db";
import { env } from "@/env";

export const auth = createAuth(db, {
  secret: env.BETTER_AUTH_SECRET,
  apiKeySigningSecret: env.API_KEY_SIGNING_SECRET,
  deviceVerificationUri: "/device",
  sendResetPassword: async ({ user, url }) => {
    // TODO: Integrate email provider (Resend, SendGrid, etc.)
    // Fire and forget to prevent timing attacks
    console.log(`[Auth] Password reset requested for ${user.email}: ${url}`);
  },
});
