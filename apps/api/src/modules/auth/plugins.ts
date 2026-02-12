import {
  apiKey,
  bearer,
  deviceAuthorization,
  emailHarmony,
  organization,
} from "@usevon/auth";
import { db, eq } from "@usevon/db";
import * as schema from "@usevon/db/schema";
import { APIError } from "better-auth/api";
import mailchecker from "mailchecker";
import isEmail from "validator/es/lib/isEmail.js";
import { env } from "@/env";
import type { SecondaryStorageAdapter } from "@/modules/auth/storage";

type SessionInsert = typeof schema.session.$inferInsert;

export const buildAuthPlugins = (secondaryStorage: SecondaryStorageAdapter) => [
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
];

export const authDatabaseHooks = {
  user: {
    delete: {
      before: async (user: { id: string }) => {
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
      before: async (session: SessionInsert) => {
        const s = session;
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
};
