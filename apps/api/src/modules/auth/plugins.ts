import {
  apiKey,
  auditLog,
  bearer,
  deviceAuthorization,
  emailHarmony,
  organization,
} from "@usevon/auth";
import { db, eq } from "@usevon/db";
import * as schema from "@usevon/db/schema";
import { InvitationEmail, render, WelcomeEmail } from "@usevon/email";
import { APIError } from "better-auth/api";
import mailchecker from "mailchecker";
import isEmail from "validator/es/lib/isEmail.js";
import { env } from "@/env";
import { log } from "@/lib/logger";
import { resendClient } from "@/lib/resend";
import type { SecondaryStorageAdapter } from "@/modules/auth/storage";

type SessionInsert = typeof schema.session.$inferInsert;

const { plugin: auditLogPlugin, apiKeyHooks, organizationHooks } = auditLog();

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
  auditLogPlugin,
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
    sendInvitationEmail: async (data) => {
      const dashboardUrl = env.DASHBOARD_URL ?? "http://localhost:3001";
      const inviteLink = `${dashboardUrl}/organization/accept-invitation/${data.id}`;

      const html = await render(
        InvitationEmail({
          inviterName: data.inviter.user.name,
          organizationName: data.organization.name,
          role: data.role,
          inviteLink,
        })
      );

      await resendClient.sendEmail({
        to: data.email,
        subject: `You've been invited to join ${data.organization.name}`,
        html,
      });
    },
    organizationHooks: {
      ...organizationHooks,
      afterAddMember: async (
        data: Parameters<typeof organizationHooks.afterAddMember>[0]
      ) => {
        await organizationHooks.afterAddMember(data);
        await db
          .update(schema.session)
          .set({ activeOrganizationId: data.member.organizationId })
          .where(eq(schema.session.userId, data.member.userId));
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
          apiKeyHooks,
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
    create: {
      after: async (user: { name: string; email: string }) => {
        try {
          const html = await render(
            WelcomeEmail({
              name: user.name,
              dashboardUrl: env.DASHBOARD_URL ?? "http://localhost:3001",
            })
          );

          await resendClient.sendEmail({
            to: user.email,
            subject: "Welcome to Von",
            html,
          });
        } catch (err) {
          log.error({ err, email: user.email }, "Failed to send welcome email");
        }
      },
    },
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
