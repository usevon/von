import { createAuthMiddleware, getSessionFromCtx } from "better-auth/api"
import type { AuditEventType } from "@/plugins/access-control/types"

/**
 * Creates the after-hook handler for audit logging
 * Uses better-auth's createAuthMiddleware pattern
 */
export function createAuditHook(auditEvents: Record<string, AuditEventType>) {
  return createAuthMiddleware(async (ctx) => {
    const eventType = auditEvents[ctx.path]
    if (!eventType) return

    const session = await getSessionFromCtx(ctx)

    await ctx.context.adapter.create({
      model: "auditLog",
      data: {
        id: crypto.randomUUID(),
        organizationId: session?.session?.activeOrganizationId ?? null,
        userId: session?.user?.id ?? null,
        eventType,
        resourceType: ctx.path.split("/")[1] ?? null,
        resourceId: ctx.body?.id ?? null,
        metadata: JSON.stringify({ path: ctx.path }),
        ipAddress: ctx.headers?.get("x-forwarded-for") ?? null,
        userAgent: ctx.headers?.get("user-agent") ?? null,
        createdAt: new Date(),
      },
    })
  })
}
