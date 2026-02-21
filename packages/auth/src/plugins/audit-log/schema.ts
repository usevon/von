import type { BetterAuthPlugin } from "better-auth/minimal";

type BetterAuthPluginDBSchema = NonNullable<BetterAuthPlugin["schema"]>;

export const auditLogSchema = () =>
  ({
    auditLog: {
      fields: {
        organizationId: {
          type: "string",
          required: true,
          input: false,
          references: {
            model: "organization",
            field: "id",
            onDelete: "cascade",
          },
        },
        actorId: {
          type: "string",
          required: false,
          input: false,
        },
        actorType: {
          type: "string",
          required: true,
          input: false,
        },
        action: {
          type: "string",
          required: true,
          input: false,
        },
        resourceType: {
          type: "string",
          required: true,
          input: false,
        },
        resourceId: {
          type: "string",
          required: true,
          input: false,
        },
        resourceName: {
          type: "string",
          required: false,
          input: false,
        },
        metadata: {
          type: "string",
          required: false,
          input: false,
        },
        ipAddress: {
          type: "string",
          required: false,
          input: false,
        },
        userAgent: {
          type: "string",
          required: false,
          input: false,
        },
        createdAt: {
          type: "date",
          required: true,
          input: false,
        },
        expiresAt: {
          type: "date",
          required: true,
          input: false,
        },
      },
    },
  }) satisfies BetterAuthPluginDBSchema;
