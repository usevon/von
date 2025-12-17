import type { BetterAuthPlugin } from "better-auth"
import { accessControlSchema } from "@/plugins/access-control/schema"
import { listAuditLogs } from "@/plugins/access-control/routes"
import { createAuditHook } from "@/plugins/access-control/audit"
import { createRequireScope } from "@/plugins/access-control/middleware"
import { SCOPES, DEFAULT_ROLE_SCOPES, hasScope, expandScopes } from "@/plugins/access-control/scopes"
import type { AccessControlOptions, ResolvedAccessControlOptions } from "@/plugins/access-control/types"

export const ERROR_CODES = {
  UNAUTHORIZED: "Authentication required",
  FORBIDDEN: "Insufficient permissions",
  NO_ACTIVE_ORG: "No active organization",
  ADMIN_REQUIRED: "Admin access required",
} as const

function resolveOptions(options?: AccessControlOptions): ResolvedAccessControlOptions {
  return {
    roles: {
      owner: options?.roles?.owner ?? DEFAULT_ROLE_SCOPES.owner,
      admin: options?.roles?.admin ?? DEFAULT_ROLE_SCOPES.admin,
      member: options?.roles?.member ?? DEFAULT_ROLE_SCOPES.member,
      ...options?.roles,
    },
    scopes: { ...SCOPES, ...options?.scopes },
    auditEvents: options?.auditEvents ?? {},
    retentionDays: options?.retentionDays ?? 90,
    disableAudit: options?.disableAudit ?? false,
  }
}

export const accessControl = (options?: AccessControlOptions) => {
  const opts = resolveOptions(options)
  const requireScope = createRequireScope(opts.roles)

  return {
    id: "access-control",
    $ERROR_CODES: ERROR_CODES,
    schema: accessControlSchema,
    endpoints: {
      listAuditLogs: listAuditLogs(),
    },
    hooks: {
      after: opts.disableAudit
        ? []
        : [
            {
              matcher: (ctx: { path: string }) => {
                return !!opts.auditEvents[ctx.path]
              },
              handler: createAuditHook(opts.auditEvents),
            },
          ],
    },
    $context: {
      accessControl: {
        requireScope,
        hasScope,
        expandScopes,
        scopes: opts.scopes,
        roleScopes: opts.roles,
      },
    },
  } satisfies BetterAuthPlugin
}

export type { AccessControlOptions, AuditEventType, AuditLog, ApiKeyScope } from "@/plugins/access-control/types"
export { SCOPES, hasScope, expandScopes, validateScopes } from "@/plugins/access-control/scopes"
export { createRequireScope } from "@/plugins/access-control/middleware"
