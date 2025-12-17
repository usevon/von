export type AuditEventType =
  // Auth
  | "auth.login"
  | "auth.logout"
  | "auth.password_change"
  | "auth.email_change"
  // Organization
  | "org.created"
  | "org.updated"
  | "org.deleted"
  | "org.member_added"
  | "org.member_removed"
  | "org.member_role_changed"
  | "org.invitation_sent"
  | "org.invitation_accepted"
  | "org.invitation_revoked"
  // API Keys
  | "apikey.created"
  | "apikey.updated"
  | "apikey.deleted"
  | "apikey.verified"
  | "apikey.verification_failed"
  // Device Auth
  | "device.code_requested"
  | "device.authorized"
  | "device.denied"
  // Bearer
  | "bearer.token_used"

export type RoleScopes = {
  owner?: string[]
  admin?: string[]
  member?: string[]
  [custom: string]: string[] | undefined
}

export type AccessControlOptions = {
  /** Role-to-scope mapping (configurable per deployment) */
  roles?: RoleScopes
  /** Custom scopes beyond defaults */
  scopes?: Record<string, string>
  /** Audit events to capture - maps endpoint paths to event types */
  auditEvents?: Record<string, AuditEventType>
  /** Audit log retention in days (default: 90) */
  retentionDays?: number
  /** Disable audit logging */
  disableAudit?: boolean
}

export type ResolvedAccessControlOptions = {
  roles: Required<RoleScopes>
  scopes: Record<string, string>
  auditEvents: Record<string, AuditEventType>
  retentionDays: number
  disableAudit: boolean
}

export type AuditLog = {
  id: string
  organizationId: string | null
  userId: string | null
  eventType: AuditEventType
  resourceType: string | null
  resourceId: string | null
  metadata: string | null
  ipAddress: string | null
  userAgent: string | null
  createdAt: Date
}

export type ApiKeyScope = {
  id: string
  apikeyId: string
  scope: string
  createdAt: Date
}
