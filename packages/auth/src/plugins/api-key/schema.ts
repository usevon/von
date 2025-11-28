import type { BetterAuthPlugin } from "better-auth"

type BetterAuthPluginDBSchema = NonNullable<BetterAuthPlugin["schema"]>

export const apiKeySchema = () =>
  ({
    apikey: {
      fields: {
        name: {
          type: "string",
          required: false,
          input: false,
        },
        start: {
          type: "string",
          required: false,
          input: false,
        },
        key: {
          type: "string",
          required: true,
          input: false,
          index: true,
        },
        userId: {
          type: "string",
          references: { model: "user", field: "id", onDelete: "cascade" },
          required: true,
          input: false,
          index: true,
        },
        organizationId: {
          type: "string",
          references: { model: "organization", field: "id", onDelete: "cascade" },
          required: false,
          input: false,
          index: true,
        },
        environment: {
          type: "string",
          required: false,
          input: false,
          defaultValue: "dev",
        },
        enabled: {
          type: "boolean",
          required: false,
          input: false,
          defaultValue: true,
        },
        expiresAt: {
          type: "date",
          required: false,
          input: false,
        },
        requestCount: {
          type: "number",
          required: false,
          input: false,
          defaultValue: 0,
        },
        lastRequest: {
          type: "date",
          required: false,
          input: false,
        },
        createdAt: {
          type: "date",
          required: true,
          input: false,
        },
        updatedAt: {
          type: "date",
          required: true,
          input: false,
        },
      },
    },
  }) satisfies BetterAuthPluginDBSchema
