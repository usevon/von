import { db } from "@usevon/db";
import { auditLog, organization } from "@usevon/db/schema";
import { eq } from "drizzle-orm";
import type {
  AuditLogEntry,
  ResolvedAuditLogOptions,
} from "@/plugins/audit-log/types";

const RETENTION_BY_PLAN: Record<string, number> = {
  hobby: 3,
};
const DEFAULT_RETENTION_DAYS = 7;

export async function defaultGetRetentionDays(
  organizationId: string
): Promise<number> {
  const rows = await db
    .select({ plan: organization.plan })
    .from(organization)
    .where(eq(organization.id, organizationId))
    .limit(1);
  const plan = rows[0]?.plan ?? "hobby";
  return RETENTION_BY_PLAN[plan] ?? DEFAULT_RETENTION_DAYS;
}

export type AuditLogInserter = (
  entry: AuditLogEntry & { expiresAt: Date }
) => Promise<void>;

export const defaultInserter: AuditLogInserter = async (entry) => {
  await db.insert(auditLog).values(entry);
};

export async function writeAuditLog(
  entry: AuditLogEntry,
  opts: ResolvedAuditLogOptions,
  inserter: AuditLogInserter = defaultInserter
): Promise<void> {
  try {
    const retentionDays = await opts.getRetentionDays(entry.organizationId);
    const expiresAt = new Date(Date.now() + retentionDays * 86_400_000);
    await inserter({ ...entry, expiresAt });
  } catch (err) {
    // never re-throws — audit log errors must not break the primary action
    console.error("[audit-log] failed to write entry:", err);
  }
}
