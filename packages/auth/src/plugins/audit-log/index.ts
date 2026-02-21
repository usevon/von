import type { BetterAuthPlugin } from "better-auth/minimal";
import type { ApiKeyHookPayload } from "@/plugins/api-key/types";
import { auditLogSchema } from "@/plugins/audit-log/schema";
import type {
  AuditLogOptions,
  ResolvedAuditLogOptions,
} from "@/plugins/audit-log/types";
import { ACTIONS } from "@/plugins/audit-log/types";
import type { AuditLogInserter } from "@/plugins/audit-log/writer";
import {
  defaultGetRetentionDays,
  defaultInserter,
  writeAuditLog,
} from "@/plugins/audit-log/writer";

export const auditLog = (
  options?: AuditLogOptions,
  inserter: AuditLogInserter = defaultInserter
) => {
  const opts: ResolvedAuditLogOptions = {
    getRetentionDays: options?.getRetentionDays ?? defaultGetRetentionDays,
  };

  const apiKeyHooks = {
    afterCreate: async (key: ApiKeyHookPayload) => {
      if (!key.organizationId) {
        return;
      }
      await writeAuditLog(
        {
          organizationId: key.organizationId,
          actorId: key.userId,
          actorType: "user",
          action: ACTIONS.APIKEY_CREATED,
          resourceType: "apikey",
          resourceId: key.id,
          resourceName: key.name,
          metadata: {
            name: key.name,
            environment: key.environment,
            scopes: key.scopes,
            expiresAt: key.expiresAt?.toISOString() ?? null,
          },
          ipAddress: null,
          userAgent: null,
        },
        opts,
        inserter
      );
    },

    afterUpdate: async (key: ApiKeyHookPayload) => {
      if (!key.organizationId) {
        return;
      }
      await writeAuditLog(
        {
          organizationId: key.organizationId,
          actorId: key.userId,
          actorType: "user",
          action: ACTIONS.APIKEY_UPDATED,
          resourceType: "apikey",
          resourceId: key.id,
          resourceName: key.name,
          metadata: {
            name: key.name,
            scopes: key.scopes,
            enabled: key.enabled,
          },
          ipAddress: null,
          userAgent: null,
        },
        opts,
        inserter
      );
    },

    afterDelete: async (key: ApiKeyHookPayload) => {
      if (!key.organizationId) {
        return;
      }
      await writeAuditLog(
        {
          organizationId: key.organizationId,
          actorId: key.userId,
          actorType: "user",
          action: ACTIONS.APIKEY_DELETED,
          resourceType: "apikey",
          resourceId: key.id,
          resourceName: key.name,
          metadata: {
            name: key.name,
            environment: key.environment,
          },
          ipAddress: null,
          userAgent: null,
        },
        opts,
        inserter
      );
    },
  };

  type Member = {
    id: string;
    organizationId: string;
    userId: string;
    role: string;
  };
  type User = { id: string; email: string; name: string };
  type Org = { id: string };
  type Invitation = {
    id: string;
    email: string;
    role?: string | null;
    organizationId: string;
  };

  const organizationHooks = {
    afterAddMember: async (data: {
      member: Member & Record<string, unknown>;
      user: User & Record<string, unknown>;
      organization: Org & Record<string, unknown>;
    }) => {
      await writeAuditLog(
        {
          organizationId: data.member.organizationId,
          actorId: data.member.userId,
          actorType: "user",
          action: ACTIONS.MEMBER_ADDED,
          resourceType: "member",
          resourceId: data.member.id,
          resourceName: String(data.user.email ?? ""),
          metadata: { role: data.member.role, email: data.user.email },
          ipAddress: null,
          userAgent: null,
        },
        opts,
        inserter
      );
    },

    afterRemoveMember: async (data: {
      member: Member & Record<string, unknown>;
      user: User & Record<string, unknown>;
      organization: Org & Record<string, unknown>;
    }) => {
      await writeAuditLog(
        {
          organizationId: data.member.organizationId,
          actorId: data.member.userId,
          actorType: "user",
          action: ACTIONS.MEMBER_REMOVED,
          resourceType: "member",
          resourceId: data.member.id,
          resourceName: String(data.user.email ?? ""),
          metadata: { role: data.member.role, email: data.user.email },
          ipAddress: null,
          userAgent: null,
        },
        opts,
        inserter
      );
    },

    afterUpdateMemberRole: async (data: {
      member: Member & Record<string, unknown>;
      previousRole: string;
      user: User & Record<string, unknown>;
      organization: Org & Record<string, unknown>;
    }) => {
      await writeAuditLog(
        {
          organizationId: data.member.organizationId,
          actorId: data.member.userId,
          actorType: "user",
          action: ACTIONS.MEMBER_ROLE_CHANGED,
          resourceType: "member",
          resourceId: data.member.id,
          resourceName: String(data.user.email ?? ""),
          metadata: {
            previousRole: data.previousRole,
            newRole: data.member.role,
            email: data.user.email,
          },
          ipAddress: null,
          userAgent: null,
        },
        opts,
        inserter
      );
    },

    afterCreateInvitation: async (data: {
      invitation: Invitation & Record<string, unknown>;
      inviter: User & Record<string, unknown>;
      organization: Org & Record<string, unknown>;
    }) => {
      await writeAuditLog(
        {
          organizationId: data.invitation.organizationId,
          actorId: data.inviter.id,
          actorType: "user",
          action: ACTIONS.INVITATION_CREATED,
          resourceType: "invitation",
          resourceId: data.invitation.id,
          resourceName: data.invitation.email,
          metadata: {
            email: data.invitation.email,
            role: data.invitation.role,
          },
          ipAddress: null,
          userAgent: null,
        },
        opts,
        inserter
      );
    },

    afterAcceptInvitation: async (data: {
      invitation: Invitation & Record<string, unknown>;
      member: Member & Record<string, unknown>;
      user: User & Record<string, unknown>;
      organization: Org & Record<string, unknown>;
    }) => {
      await writeAuditLog(
        {
          organizationId: data.invitation.organizationId,
          actorId: data.user.id,
          actorType: "user",
          action: ACTIONS.INVITATION_ACCEPTED,
          resourceType: "invitation",
          resourceId: data.invitation.id,
          resourceName: data.invitation.email,
          metadata: { email: data.invitation.email },
          ipAddress: null,
          userAgent: null,
        },
        opts,
        inserter
      );
    },

    afterRejectInvitation: async (data: {
      invitation: Invitation & Record<string, unknown>;
      user: User & Record<string, unknown>;
      organization: Org & Record<string, unknown>;
    }) => {
      await writeAuditLog(
        {
          organizationId: data.invitation.organizationId,
          actorId: data.user.id,
          actorType: "user",
          action: ACTIONS.INVITATION_REJECTED,
          resourceType: "invitation",
          resourceId: data.invitation.id,
          resourceName: data.invitation.email,
          metadata: { email: data.invitation.email },
          ipAddress: null,
          userAgent: null,
        },
        opts,
        inserter
      );
    },

    afterCancelInvitation: async (data: {
      invitation: Invitation & Record<string, unknown>;
      cancelledBy: User & Record<string, unknown>;
      organization: Org & Record<string, unknown>;
    }) => {
      await writeAuditLog(
        {
          organizationId: data.invitation.organizationId,
          actorId: data.cancelledBy.id,
          actorType: "user",
          action: ACTIONS.INVITATION_CANCELLED,
          resourceType: "invitation",
          resourceId: data.invitation.id,
          resourceName: data.invitation.email,
          metadata: { email: data.invitation.email },
          ipAddress: null,
          userAgent: null,
        },
        opts,
        inserter
      );
    },
  };

  const plugin = {
    id: "audit-log",
    schema: auditLogSchema(),
  } satisfies BetterAuthPlugin;

  return { plugin, apiKeyHooks, organizationHooks };
};

export type { AuditLogOptions } from "@/plugins/audit-log/types";
