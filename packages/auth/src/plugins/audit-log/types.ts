export const ACTIONS = {
  APIKEY_CREATED: "apikey.created",
  APIKEY_UPDATED: "apikey.updated",
  APIKEY_DELETED: "apikey.deleted",
  MEMBER_ADDED: "member.added",
  MEMBER_REMOVED: "member.removed",
  MEMBER_ROLE_CHANGED: "member.role_changed",
  INVITATION_CREATED: "invitation.created",
  INVITATION_ACCEPTED: "invitation.accepted",
  INVITATION_REJECTED: "invitation.rejected",
  INVITATION_CANCELLED: "invitation.cancelled",
} as const;

export type AuditLogEntry = {
  organizationId: string;
  actorId: string | null;
  actorType: "user" | "system";
  action: string;
  resourceType: string;
  resourceId: string;
  resourceName: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
};

export type AuditLogOptions = {
  getRetentionDays?: (organizationId: string) => Promise<number>;
};

export type ResolvedAuditLogOptions = {
  getRetentionDays: (organizationId: string) => Promise<number>;
};
