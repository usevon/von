export const SCOPES = {
  // Webhooks
  "webhooks:read": "View webhook events and deliveries",
  "webhooks:write": "Send webhook events",
  "webhooks:manage": "Full webhook management (CRUD endpoints)",

  // Endpoints
  "endpoints:read": "View endpoint configurations",
  "endpoints:manage": "Create, update, delete endpoints",

  // Inbound
  "inbound:read": "View inbound endpoint configurations",
  "inbound:manage": "Create, update, delete inbound endpoints",

  // Events
  "events:read": "View events and deliveries",
  "events:write": "Create events",

  // Organization
  "org:read": "View organization details",
  "org:manage": "Update organization settings",
  "org:members:read": "View organization members",
  "org:members:manage": "Invite, remove, update member roles",

  // API Keys
  "apikeys:read": "View own API keys",
  "apikeys:manage": "Create, update, delete API keys",

  // Wildcard
  "*": "Full access to all resources",
} as const

export type Scope = keyof typeof SCOPES

export const DEFAULT_ROLE_SCOPES = {
  owner: ["*"],
  admin: [
    "webhooks:*",
    "endpoints:*",
    "inbound:*",
    "events:*",
    "org:read",
    "org:members:*",
    "apikeys:*",
  ],
  member: [
    "webhooks:read",
    "endpoints:read",
    "inbound:read",
    "events:read",
    "org:read",
    "apikeys:read",
  ],
} as const

/**
 * Check if a set of scopes grants access to a required scope
 * Supports wildcards: "webhooks:*" matches "webhooks:read"
 */
export function hasScope(grantedScopes: string[], requiredScope: string): boolean {
  if (grantedScopes.includes("*")) return true
  if (grantedScopes.includes(requiredScope)) return true

  // Check wildcard patterns
  const [resource] = requiredScope.split(":")
  if (resource && grantedScopes.includes(`${resource}:*`)) return true

  return false
}

/**
 * Expand wildcard scopes to explicit list (for display)
 */
export function expandScopes(scopes: string[]): string[] {
  if (scopes.includes("*")) return Object.keys(SCOPES)

  return scopes.flatMap((scope) => {
    if (scope.endsWith(":*")) {
      const resource = scope.slice(0, -2)
      return Object.keys(SCOPES).filter((s) => s.startsWith(`${resource}:`))
    }
    return [scope]
  })
}

/**
 * Validate that all provided scopes are valid
 */
export function validateScopes(scopes: string[]): { valid: boolean; invalid: string[] } {
  const validScopes = new Set(Object.keys(SCOPES))
  const invalid: string[] = []

  for (const scope of scopes) {
    // Allow wildcards
    if (scope === "*" || scope.endsWith(":*")) {
      const resource = scope.replace(":*", "")
      const hasMatchingScopes = Object.keys(SCOPES).some((s) => s.startsWith(`${resource}:`))
      if (scope !== "*" && !hasMatchingScopes) {
        invalid.push(scope)
      }
      continue
    }

    if (!validScopes.has(scope)) {
      invalid.push(scope)
    }
  }

  return { valid: invalid.length === 0, invalid }
}
