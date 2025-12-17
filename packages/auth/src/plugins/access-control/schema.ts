import type { BetterAuthPlugin } from "better-auth"

type PluginSchema = NonNullable<BetterAuthPlugin["schema"]>

export const accessControlSchema = {
  auditLog: {
    fields: {
      organizationId: {
        type: "string",
        references: { model: "organization", field: "id", onDelete: "cascade" },
        required: false,
      },
      userId: {
        type: "string",
        references: { model: "user", field: "id", onDelete: "set null" },
        required: false,
      },
      eventType: { type: "string", required: true },
      resourceType: { type: "string", required: false },
      resourceId: { type: "string", required: false },
      metadata: { type: "string", required: false },
      ipAddress: { type: "string", required: false },
      userAgent: { type: "string", required: false },
      createdAt: { type: "date", required: true },
    },
  },
  apikeyScope: {
    fields: {
      apikeyId: {
        type: "string",
        references: { model: "apikey", field: "id", onDelete: "cascade" },
        required: true,
      },
      scope: { type: "string", required: true },
      createdAt: { type: "date", required: true },
    },
  },
} satisfies PluginSchema
