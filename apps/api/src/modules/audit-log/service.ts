import { db } from "@usevon/db";
import { auditLog } from "@usevon/db/schema";
import { and, desc, eq, gt } from "drizzle-orm";
import { type CursorPageInput, runCursorListQuery } from "@/lib/pagination";
import type { AuditLogModel } from "@/modules/audit-log/model";

type AuditLogRow = typeof auditLog.$inferSelect;

type AuditLogFilters = {
  action?: string;
  resourceType?: string;
  actorId?: string;
};

const toEntry = (row: AuditLogRow): AuditLogModel.entry => ({
  id: row.id,
  organizationId: row.organizationId,
  actorId: row.actorId ?? null,
  actorType: row.actorType,
  action: row.action,
  resourceType: row.resourceType,
  resourceId: row.resourceId,
  resourceName: row.resourceName ?? null,
  metadata: (row.metadata as Record<string, unknown>) ?? null,
  ipAddress: row.ipAddress ?? null,
  userAgent: row.userAgent ?? null,
  createdAt: row.createdAt.toISOString(),
  expiresAt: row.expiresAt.toISOString(),
});

export abstract class AuditLogService {
  static async list(
    organizationId: string,
    pagination: CursorPageInput,
    filters: AuditLogFilters
  ): Promise<AuditLogModel.list> {
    const now = new Date();

    const conditions = [
      eq(auditLog.organizationId, organizationId),
      gt(auditLog.expiresAt, now),
    ];

    if (filters.action) {
      conditions.push(eq(auditLog.action, filters.action));
    }
    if (filters.resourceType) {
      conditions.push(eq(auditLog.resourceType, filters.resourceType));
    }
    if (filters.actorId) {
      conditions.push(eq(auditLog.actorId, filters.actorId));
    }

    const { items, nextCursor } = await runCursorListQuery({
      pagination,
      sort: "desc",
      scope: {
        resource: "audit-log",
        organizationId,
        action: filters.action ?? null,
        resourceType: filters.resourceType ?? null,
        actorId: filters.actorId ?? null,
      },
      createdAtColumn: auditLog.createdAt,
      idColumn: auditLog.id,
      baseCondition:
        and(...conditions) ?? eq(auditLog.organizationId, organizationId),
      fetchRows: (where, limit) =>
        db
          .select()
          .from(auditLog)
          .where(where)
          .orderBy(desc(auditLog.createdAt), desc(auditLog.id))
          .limit(limit),
      toCursorPosition: (row) => ({
        createdAt: row.createdAt,
        id: row.id,
      }),
    });

    return {
      entries: items.map(toEntry),
      nextCursor,
    };
  }
}
