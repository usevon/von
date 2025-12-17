import { createAuthEndpoint, APIError, getSessionFromCtx } from "better-auth/api"
import { z } from "zod"
import type { AuditLog } from "@/plugins/access-control/types"

const AUDIT_LOG_TABLE_NAME = "auditLog"

export function listAuditLogs() {
  return createAuthEndpoint(
    "/access-control/audit-logs",
    {
      method: "GET",
      query: z.object({
        limit: z.coerce.number().min(1).max(100).optional().default(50),
        offset: z.coerce.number().min(0).optional().default(0),
        eventType: z.string().optional(),
      }),
    },
    async (ctx) => {
      const session = await getSessionFromCtx(ctx)
      if (!session) {
        throw new APIError("UNAUTHORIZED", {
          message: "Authentication required",
        })
      }

      const organizationId = session.session?.activeOrganizationId
      if (!organizationId) {
        throw new APIError("BAD_REQUEST", {
          message: "No active organization",
        })
      }

      // Check if user is admin or owner
      const member = await ctx.context.adapter.findOne<{ role: string }>({
        model: "member",
        where: [
          { field: "userId", value: session.user.id },
          { field: "organizationId", value: organizationId },
        ],
      })

      if (!member || !["owner", "admin"].includes(member.role)) {
        throw new APIError("FORBIDDEN", {
          message: "Admin access required",
        })
      }

      const { limit, offset, eventType } = ctx.query

      const where: Array<{ field: string; value: unknown }> = [
        { field: "organizationId", value: organizationId },
      ]

      if (eventType) {
        where.push({ field: "eventType", value: eventType })
      }

      const logs = await ctx.context.adapter.findMany<AuditLog>({
        model: AUDIT_LOG_TABLE_NAME,
        where,
        limit,
        offset,
        sortBy: { field: "createdAt", direction: "desc" },
      })

      return ctx.json({
        logs,
        pagination: {
          limit,
          offset,
          hasMore: logs.length === limit,
        },
      })
    }
  )
}
