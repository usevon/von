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

export type CreateAuthOptions = {
  secret: string;
  baseURL?: string;
  trustedOrigins?: string[];
  deviceVerificationUri?: string;
  /**
   * Secondary storage for API key caching (Redis).
   * Enables faster API key lookups by caching in Redis with DB fallback.
   */
  secondaryStorage: SecondaryStorage;
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
      storage: "memory",
    },
    emailAndPassword: {
      enabled: true,
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
        storage: "secondary-storage",
        fallbackToDatabase: true,
      }),
      deviceAuthorization({
        verificationUri:
          options.deviceVerificationUri ?? "http://localhost:5174/device",
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

export const generateId = () => crypto.randomUUID();
