import type { BetterAuthPlugin } from "better-auth/minimal";

type BetterAuthPluginDBSchema = NonNullable<BetterAuthPlugin["schema"]>;

export const apiKeySchema = () =>
  ({
    apikey: {
      fields: {
        name: {
          type: "string",
          required: true,
          input: false,
        },
        start: {
          type: "string",
          required: true,
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
          references: {
            model: "organization",
            field: "id",
            onDelete: "cascade",
          },
          required: false,
          input: false,
          index: true,
        },
        environment: {
          type: "string",
          required: true,
          input: false,
        },
        scopes: {
          type: "string",
          required: false,
          input: false,
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
        lastUsedAt: {
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
  }) satisfies BetterAuthPluginDBSchema;
