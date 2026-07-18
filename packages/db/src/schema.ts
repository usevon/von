import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  id: uuid("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  normalizedEmail: text("normalized_email").unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const session = pgTable(
  "session",
  {
    id: uuid("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    activeOrganizationId: uuid("active_organization_id"),
  },
  (table) => [index("session_user_id_idx").on(table.userId)]
);

export const account = pgTable(
  "account",
  {
    id: uuid("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("account_user_id_idx").on(table.userId)]
);

export const verification = pgTable(
  "verification",
  {
    id: uuid("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)]
);

export const organization = pgTable(
  "organization",
  {
    id: uuid("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    logo: text("logo"),
    plan: text("plan").default("free").notNull(),
    createdAt: timestamp("created_at").notNull(),
    metadata: text("metadata"),
  },
  (table) => [uniqueIndex("organization_slug_uidx").on(table.slug)]
);

export const member = pgTable(
  "member",
  {
    id: uuid("id").primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role").default("member").notNull(),
    createdAt: timestamp("created_at").notNull(),
  },
  (table) => [
    index("member_organization_id_idx").on(table.organizationId),
    index("member_user_id_idx").on(table.userId),
  ]
);

export const invitation = pgTable(
  "invitation",
  {
    id: uuid("id").primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: text("role"),
    status: text("status").default("pending").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    inviterId: uuid("inviter_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("invitation_organization_id_idx").on(table.organizationId),
    index("invitation_email_idx").on(table.email),
  ]
);

export const deviceCode = pgTable(
  "device_code",
  {
    id: uuid("id").primaryKey(),
    deviceCode: text("device_code").notNull(),
    userCode: text("user_code").notNull(),
    userId: uuid("user_id").references(() => user.id, { onDelete: "cascade" }),
    clientId: text("client_id"),
    scope: text("scope"),
    status: text("status").default("pending").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    lastPolledAt: timestamp("last_polled_at"),
    pollingInterval: integer("polling_interval"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("device_code_device_code_idx").on(table.deviceCode),
    index("device_code_user_code_idx").on(table.userCode),
  ]
);

export const apikey = pgTable(
  "apikey",
  {
    id: uuid("id").primaryKey(),
    name: text("name").notNull(),
    start: text("start").notNull(),
    key: text("key").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    organizationId: uuid("organization_id").references(() => organization.id, {
      onDelete: "cascade",
    }),
    environment: text("environment").notNull(),
    scopes: jsonb("scopes").$type<string[]>(),
    enabled: boolean("enabled").default(true).notNull(),
    expiresAt: timestamp("expires_at"),
    lastUsedAt: timestamp("last_used_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("apikey_key_uidx").on(table.key),
    index("apikey_user_id_idx").on(table.userId),
    index("apikey_organization_id_idx").on(table.organizationId),
  ]
);

export const endpoint = pgTable(
  "endpoint",
  {
    id: uuid("id").primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    description: text("description"),
    secret: text("secret").notNull(),
    previousSecret: text("previous_secret"),
    status: text("status").default("active").notNull(),
    version: text("version"),
    maxAttempts: integer("max_attempts").default(4).notNull(),
    timeoutMs: integer("timeout_ms").default(30_000).notNull(),
    events: text("events").array(),
    circuitState: text("circuit_state").default("closed").notNull(),
    failureCount: integer("failure_count").default(0).notNull(),
    lastFailureAt: timestamp("last_failure_at"),
    lastSuccessAt: timestamp("last_success_at"),
    circuitOpenedAt: timestamp("circuit_opened_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("endpoint_org_created_id_idx").on(
      table.organizationId,
      table.createdAt,
      table.id
    ),
    index("endpoint_org_status_idx").on(table.organizationId, table.status),
  ]
);

export const event = pgTable(
  "event",
  {
    id: uuid("id").primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    eventType: text("event_type").notNull(),
    payload: jsonb("payload").$type<unknown>().notNull(),
    idempotencyKey: text("idempotency_key"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("event_org_created_id_idx").on(
      table.organizationId,
      table.createdAt,
      table.id
    ),
    index("event_org_type_created_idx").on(
      table.organizationId,
      table.eventType,
      table.createdAt,
      table.id
    ),
    index("event_created_at_idx").on(table.createdAt),
    unique("event_org_idempotency_unique").on(
      table.organizationId,
      table.idempotencyKey
    ),
  ]
);

export const delivery = pgTable(
  "delivery",
  {
    id: uuid("id").primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    eventId: uuid("event_id")
      .notNull()
      .references(() => event.id, { onDelete: "cascade" }),
    endpointId: uuid("endpoint_id")
      .notNull()
      .references(() => endpoint.id, { onDelete: "cascade" }),
    status: text("status").default("pending").notNull(),
    attempts: integer("attempts").default(0).notNull(),
    lastAttemptAt: timestamp("last_attempt_at"),
    response: jsonb("response"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("delivery_org_created_id_idx").on(
      table.organizationId,
      table.createdAt,
      table.id
    ),
    index("delivery_org_status_created_idx").on(
      table.organizationId,
      table.status,
      table.createdAt
    ),
    index("delivery_event_id_idx").on(table.eventId),
    index("delivery_endpoint_status_idx").on(table.endpointId, table.status),
    index("delivery_event_created_id_idx").on(
      table.eventId,
      table.createdAt,
      table.id
    ),
    index("delivery_status_created_idx").on(table.status, table.createdAt),
    index("delivery_endpoint_status_created_idx").on(
      table.endpointId,
      table.status,
      table.createdAt
    ),
    index("delivery_created_at_idx").on(table.createdAt),
  ]
);

export const deliveryAttempt = pgTable(
  "delivery_attempt",
  {
    id: uuid("id").primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    deliveryId: uuid("delivery_id")
      .notNull()
      .references(() => delivery.id, { onDelete: "cascade" }),
    eventId: uuid("event_id")
      .notNull()
      .references(() => event.id, { onDelete: "cascade" }),
    endpointId: uuid("endpoint_id")
      .notNull()
      .references(() => endpoint.id, { onDelete: "cascade" }),
    attemptNumber: integer("attempt_number").notNull(),
    outcome: text("outcome").notNull(),
    isFinal: boolean("is_final").default(false).notNull(),
    httpStatus: integer("http_status"),
    error: text("error"),
    durationMs: integer("duration_ms").notNull(),
    startedAt: timestamp("started_at").notNull(),
    finishedAt: timestamp("finished_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    unique("delivery_attempt_delivery_number_unique").on(
      table.deliveryId,
      table.attemptNumber
    ),
    index("delivery_attempt_delivery_number_idx").on(
      table.deliveryId,
      table.attemptNumber
    ),
    index("delivery_attempt_org_created_id_idx").on(
      table.organizationId,
      table.createdAt,
      table.id
    ),
    index("delivery_attempt_endpoint_created_id_idx").on(
      table.endpointId,
      table.createdAt,
      table.id
    ),
    index("delivery_attempt_outcome_created_idx").on(
      table.outcome,
      table.createdAt
    ),
  ]
);

export const inboundEndpoint = pgTable(
  "inbound_endpoint",
  {
    id: uuid("id").primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: text("name"),
    provider: text("provider"),
    secret: text("secret").notNull(),
    previousSecret: text("previous_secret"),
    forwardUrl: text("forward_url").notNull(),
    status: text("status").default("active").notNull(),
    maxAttempts: integer("max_attempts").default(4).notNull(),
    timeoutMs: integer("timeout_ms").default(30_000).notNull(),
    circuitState: text("circuit_state").default("closed").notNull(),
    failureCount: integer("failure_count").default(0).notNull(),
    lastFailureAt: timestamp("last_failure_at"),
    lastSuccessAt: timestamp("last_success_at"),
    circuitOpenedAt: timestamp("circuit_opened_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("inbound_endpoint_org_created_id_idx").on(
      table.organizationId,
      table.createdAt,
      table.id
    ),
    index("inbound_endpoint_org_status_idx").on(
      table.organizationId,
      table.status
    ),
  ]
);

export const inboundDelivery = pgTable(
  "inbound_delivery",
  {
    id: uuid("id").primaryKey(),
    inboundEndpointId: uuid("inbound_endpoint_id")
      .notNull()
      .references(() => inboundEndpoint.id, { onDelete: "cascade" }),
    payload: jsonb("payload").$type<unknown>().notNull(),
    headers: jsonb("headers").$type<Record<string, string>>(),
    status: text("status").default("pending").notNull(),
    attempts: integer("attempts").default(0).notNull(),
    lastAttemptAt: timestamp("last_attempt_at"),
    forwardedAt: timestamp("forwarded_at"),
    response: jsonb("response"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("inbound_delivery_endpoint_id_idx").on(table.inboundEndpointId),
    index("inbound_delivery_endpoint_status_idx").on(
      table.inboundEndpointId,
      table.status
    ),
    index("inbound_delivery_created_at_idx").on(table.createdAt),
  ]
);

export const tunnel = pgTable(
  "tunnel",
  {
    id: text("id").primaryKey(),
    secret: text("secret").notNull(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    port: integer("port").notNull(),
    status: text("status").default("active").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("tunnel_organization_id_idx").on(table.organizationId),
    index("tunnel_user_id_idx").on(table.userId),
  ]
);

export const webhookVersion = pgTable(
  "webhook_version",
  {
    id: uuid("id").primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    version: text("version").notNull(),
    transforms: jsonb("transforms").$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("webhook_version_org_created_id_idx").on(
      table.organizationId,
      table.createdAt,
      table.id
    ),
    unique("webhook_version_org_version_unique").on(
      table.organizationId,
      table.version
    ),
  ]
);

export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    actorId: uuid("actor_id"),
    actorType: text("actor_type").notNull(),
    action: text("action").notNull(),
    resourceType: text("resource_type").notNull(),
    resourceId: text("resource_id").notNull(),
    resourceName: text("resource_name"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    expiresAt: timestamp("expires_at").notNull(),
  },
  (table) => [
    index("audit_log_org_created_idx").on(
      table.organizationId,
      table.createdAt
    ),
    index("audit_log_org_action_idx").on(table.organizationId, table.action),
    index("audit_log_expires_at_idx").on(table.expiresAt),
  ]
);

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  members: many(member),
  invitations: many(invitation),
  apikeys: many(apikey),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const organizationRelations = relations(organization, ({ many }) => ({
  members: many(member),
  invitations: many(invitation),
  apikeys: many(apikey),
  endpoints: many(endpoint),
  events: many(event),
  inboundEndpoints: many(inboundEndpoint),
  webhookVersions: many(webhookVersion),
  auditLogs: many(auditLog),
}));

export const memberRelations = relations(member, ({ one }) => ({
  organization: one(organization, {
    fields: [member.organizationId],
    references: [organization.id],
  }),
  user: one(user, {
    fields: [member.userId],
    references: [user.id],
  }),
}));

export const invitationRelations = relations(invitation, ({ one }) => ({
  organization: one(organization, {
    fields: [invitation.organizationId],
    references: [organization.id],
  }),
  inviter: one(user, {
    fields: [invitation.inviterId],
    references: [user.id],
  }),
}));

export const apikeyRelations = relations(apikey, ({ one }) => ({
  user: one(user, {
    fields: [apikey.userId],
    references: [user.id],
  }),
  organization: one(organization, {
    fields: [apikey.organizationId],
    references: [organization.id],
  }),
}));

export const endpointRelations = relations(endpoint, ({ one, many }) => ({
  organization: one(organization, {
    fields: [endpoint.organizationId],
    references: [organization.id],
  }),
  deliveries: many(delivery),
  deliveryAttempts: many(deliveryAttempt),
}));

export const eventRelations = relations(event, ({ one, many }) => ({
  organization: one(organization, {
    fields: [event.organizationId],
    references: [organization.id],
  }),
  deliveries: many(delivery),
  deliveryAttempts: many(deliveryAttempt),
}));

export const deliveryRelations = relations(delivery, ({ one, many }) => ({
  organization: one(organization, {
    fields: [delivery.organizationId],
    references: [organization.id],
  }),
  event: one(event, {
    fields: [delivery.eventId],
    references: [event.id],
  }),
  endpoint: one(endpoint, {
    fields: [delivery.endpointId],
    references: [endpoint.id],
  }),
  attempts: many(deliveryAttempt),
}));

export const deliveryAttemptRelations = relations(
  deliveryAttempt,
  ({ one }) => ({
    organization: one(organization, {
      fields: [deliveryAttempt.organizationId],
      references: [organization.id],
    }),
    delivery: one(delivery, {
      fields: [deliveryAttempt.deliveryId],
      references: [delivery.id],
    }),
    event: one(event, {
      fields: [deliveryAttempt.eventId],
      references: [event.id],
    }),
    endpoint: one(endpoint, {
      fields: [deliveryAttempt.endpointId],
      references: [endpoint.id],
    }),
  })
);

export const inboundEndpointRelations = relations(
  inboundEndpoint,
  ({ one, many }) => ({
    organization: one(organization, {
      fields: [inboundEndpoint.organizationId],
      references: [organization.id],
    }),
    deliveries: many(inboundDelivery),
  })
);

export const inboundDeliveryRelations = relations(
  inboundDelivery,
  ({ one }) => ({
    inboundEndpoint: one(inboundEndpoint, {
      fields: [inboundDelivery.inboundEndpointId],
      references: [inboundEndpoint.id],
    }),
  })
);

export const tunnelRelations = relations(tunnel, ({ one }) => ({
  organization: one(organization, {
    fields: [tunnel.organizationId],
    references: [organization.id],
  }),
  user: one(user, {
    fields: [tunnel.userId],
    references: [user.id],
  }),
}));

export const deviceCodeRelations = relations(deviceCode, ({ one }) => ({
  user: one(user, {
    fields: [deviceCode.userId],
    references: [user.id],
  }),
}));

export const webhookVersionRelations = relations(webhookVersion, ({ one }) => ({
  organization: one(organization, {
    fields: [webhookVersion.organizationId],
    references: [organization.id],
  }),
}));

export const auditLogRelations = relations(auditLog, ({ one }) => ({
  organization: one(organization, {
    fields: [auditLog.organizationId],
    references: [organization.id],
  }),
}));
