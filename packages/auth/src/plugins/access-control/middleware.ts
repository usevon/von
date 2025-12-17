import { APIError, getSessionFromCtx } from "better-auth/api"
import { hasScope, DEFAULT_ROLE_SCOPES } from "@/plugins/access-control/scopes"
import type { RoleScopes, ApiKeyScope } from "@/plugins/access-control/types"

type AuthContext = Parameters<Parameters<typeof getSessionFromCtx>[0]>[0]

/**
 * Get member role for a user in an organization
 */
async function getMemberRole(
  ctx: AuthContext,
  organizationId: string,
  userId: string
): Promise<string> {
  const member = await ctx.context.adapter.findOne<{ role: string }>({
    model: "member",
    where: [
      { field: "userId", value: userId },
      { field: "organizationId", value: organizationId },
    ],
  })
  return member?.role ?? "member"
}

/**
 * Get scopes for an API key
 */
async function getApiKeyScopes(ctx: AuthContext, apikeyId: string): Promise<string[]> {
  const scopes = await ctx.context.adapter.findMany<ApiKeyScope>({
    model: "apikeyScope",
    where: [{ field: "apikeyId", value: apikeyId }],
  })
  return scopes.map((s) => s.scope)
}

/**
 * Create a scope checking function for use in endpoints
 * Checks if the current session/API key has the required scope
 */
export function createRequireScope(roleScopes: RoleScopes = DEFAULT_ROLE_SCOPES) {
  return function requireScope(requiredScope: string) {
    return async (ctx: AuthContext) => {
      const session = await getSessionFromCtx(ctx)

      // If session auth (not API key), check role permissions
      if (session) {
        const memberRole = session.session?.activeOrganizationId
          ? await getMemberRole(ctx, session.session.activeOrganizationId, session.user.id)
          : "member"

        const grantedScopes = roleScopes[memberRole] ?? roleScopes.member ?? []
        if (!hasScope(grantedScopes, requiredScope)) {
          throw new APIError("FORBIDDEN", { message: "Insufficient permissions" })
        }
        return
      }

      // Check if request has API key context (set by api-key plugin verify)
      const apiKeyId = (ctx as unknown as { apiKeyId?: string }).apiKeyId
      if (apiKeyId) {
        const keyScopes = await getApiKeyScopes(ctx, apiKeyId)
        if (!hasScope(keyScopes, requiredScope)) {
          throw new APIError("FORBIDDEN", { message: "API key lacks required scope" })
        }
        return
      }

      throw new APIError("UNAUTHORIZED", { message: "Authentication required" })
    }
  }
}
