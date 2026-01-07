/**
 * Dashboard Auth Server
 *
 * Full better-auth configuration with email/password, organizations,
 * API keys, device authorization, and database hooks.
 */

import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { betterAuth } from "better-auth/minimal";
import { bearer, deviceAuthorization, organization } from "better-auth/plugins";
import { apiKey } from "@usevon/auth";
import { db, eq } from "@usevon/db";
import * as schema from "@usevon/db/schema";

import { env } from "@/env";

type SessionInsert = typeof schema.session.$inferInsert;

export const COOKIE_PREFIX = "von";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),
  secret: env.BETTER_AUTH_SECRET,
  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
    storage: "memory",
  },
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url }) => {
      // TODO: Integrate email provider (Resend, SendGrid, etc.)
      // Fire and forget to prevent timing attacks
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
    cookiePrefix: COOKIE_PREFIX,
    database: {
      generateId: () => crypto.randomUUID(),
    },
  },
  plugins: [
    bearer(),
    organization({
      organizationHooks: {
        afterAddMember: async ({ member }) => {
          // Auto-set activeOrganizationId on user's sessions when they join an org
          await db
            .update(schema.session)
            .set({ activeOrganizationId: member.organizationId })
            .where(eq(schema.session.userId, member.userId));
        },
      },
    }),
    apiKey({
      storage: "database",
      fallbackToDatabase: false,
      signingSecret: env.API_KEY_SIGNING_SECRET,
    }),
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
          // Find orgs where user is sole member and delete them
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

export type Auth = typeof auth;
export type Session = Auth["$Infer"]["Session"];
export type User = Session["user"];

/**
 * Validates and sanitizes a redirect URL to prevent open redirect attacks.
 * Only allows internal paths (starting with / but not //).
 */
export function getSafeRedirect(url: string | undefined): string {
  if (!url) return "/";
  if (url.startsWith("/") && !url.startsWith("//")) {
    return url;
  }
  return "/";
}
