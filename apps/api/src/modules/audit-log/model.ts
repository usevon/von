import { t } from "elysia";

export namespace AuditLogModel {
  export const query = t.Object({
    limit: t.Optional(t.Numeric({ default: 20, minimum: 1, maximum: 100 })),
    cursor: t.Optional(t.String({ maxLength: 256 })),
    action: t.Optional(t.String()),
    resourceType: t.Optional(t.String()),
    actorId: t.Optional(t.String({ format: "uuid" })),
  });

  export const entry = t.Object({
    id: t.String({ format: "uuid" }),
    organizationId: t.String({ format: "uuid" }),
    actorId: t.Union([t.String({ format: "uuid" }), t.Null()]),
    actorType: t.String(),
    action: t.String(),
    resourceType: t.String(),
    resourceId: t.String(),
    resourceName: t.Union([t.String(), t.Null()]),
    metadata: t.Union([t.Unknown(), t.Null()]),
    ipAddress: t.Union([t.String(), t.Null()]),
    userAgent: t.Union([t.String(), t.Null()]),
    createdAt: t.String(),
    expiresAt: t.String(),
  });

  export type entry = typeof entry.static;

  export const list = t.Object({
    entries: t.Array(entry),
    nextCursor: t.Union([t.String(), t.Null()]),
  });

  export type list = typeof list.static;
}
