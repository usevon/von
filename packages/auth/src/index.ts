/**
 * Von Auth Server
 *
 * Centralized authentication using better-auth/minimal with Drizzle adapter.
 * Uses UUID for primary keys and includes organization and a custom api key plugin.
 */

import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { betterAuth } from "better-auth/minimal";
import { bearer, deviceAuthorization, organization } from "better-auth/plugins";
import { apiKey } from "@/plugins/api-key";
import { eq, type Database } from "@usevon/db";
import * as schema from "@usevon/db/schema";

type SessionInsert = typeof schema.session.$inferInsert;

export type SecondaryStorage = {
  get: (key: string) => Promise<string | null> | string | null;
  set: (key: string, value: string, ttl?: number) => Promise<void> | void;
  delete: (key: string) => Promise<void> | void;
};

/** Full user type from better-auth (used in callbacks) */
export type BetterAuthUser = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  email: string;
  emailVerified: boolean;
  name: string;
  image?: string | null;
};

export type PasswordResetData = {
  user: BetterAuthUser;
  url: string;
  token: string;
};

export type CreateAuthOptions = {
  secret: string;
  baseURL?: string;
  trustedOrigins?: string[];
  deviceVerificationUri?: string;
  /**
   * Secondary storage for API key caching and rate limiting (Redis).
   * Enables faster API key lookups by caching in Redis with DB fallback.
   * Also used for distributed rate limiting across multiple instances.
   * If not provided, uses database-only storage for API keys and memory for rate limiting.
   */
  secondaryStorage?: SecondaryStorage;
  /**
   * Signing secret for API keys (required in production).
   */
  apiKeySigningSecret?: string;
  /**
   * Callback to send password reset emails.
   * If provided, enables password reset functionality.
   * Don't await to prevent timing attacks.
   */
  sendResetPassword?: (data: PasswordResetData, request?: Request) => Promise<void>;
  /**
   * Callback after password has been reset.
   */
  onPasswordReset?: (data: { user: BetterAuthUser }, request?: Request) => Promise<void>;
};

export const createAuth = (db: Database, options: CreateAuthOptions) =>
  betterAuth({
    database: drizzleAdapter(db, { provider: "pg" }),
    secret: options.secret,
    baseURL: options.baseURL,
    trustedOrigins: options.trustedOrigins,
    rateLimit: {
      enabled: true,
      window: 60,
      max: 100,
      ...(options.secondaryStorage
        ? {
            customStorage: {
              get: async (key) => {
                const value = await options.secondaryStorage!.get(key);
                return value ? JSON.parse(value) : null;
              },
              set: async (key, value) => {
                await options.secondaryStorage!.set(key, JSON.stringify(value), 60);
              },
            },
          }
        : { storage: "memory" }),
    },
    emailAndPassword: {
      enabled: true,
      sendResetPassword: options.sendResetPassword,
      onPasswordReset: options.onPasswordReset,
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
            // Auto-set activeOrganizationId on user's sessions when they join an org
            await db
              .update(schema.session)
              .set({ activeOrganizationId: member.organizationId })
              .where(eq(schema.session.userId, member.userId));
          },
        },
      }),
      apiKey({
        storage: options.secondaryStorage ? "secondary-storage" : "database",
        fallbackToDatabase: options.secondaryStorage ? true : false,
        signingSecret: options.apiKeySigningSecret,
      }),
      deviceAuthorization({
        verificationUri:
          options.deviceVerificationUri ?? "http://localhost:3001/device",
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

export type Auth = ReturnType<typeof createAuth>;
export type Session = Auth["$Infer"]["Session"];
export type User = Session["user"];

export type { ApiKey, ApiKeyOptions } from "@/plugins/api-key";
export { apiKey } from "@/plugins/api-key";

export { getSessionCookie } from "better-auth/cookies";
export const COOKIE_PREFIX = "von";

export const generateId = () => crypto.randomUUID();
