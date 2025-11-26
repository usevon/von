import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  uuid,
  index,
} from "drizzle-orm/pg-core"

export const user = pgTable("user", {
  id: uuid("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
})

export const session = pgTable("session", {
  id: uuid("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .$onUpdate(() => new Date())
    .notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: uuid("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  activeOrganizationId: uuid("active_organization_id"),
})

export const account = pgTable("account", {
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
})

export const verification = pgTable("verification", {
  id: uuid("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
})

export const organization = pgTable("organization", {
  id: uuid("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  logo: text("logo"),
  createdAt: timestamp("created_at").notNull(),
  metadata: text("metadata"),
})

export const member = pgTable("member", {
  id: uuid("id").primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  role: text("role").default("member").notNull(),
  createdAt: timestamp("created_at").notNull(),
})

export const invitation = pgTable("invitation", {
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
})

export const apikey = pgTable(
  "apikey",
  {
    id: uuid("id").primaryKey(),
    name: text("name"),
    start: text("start"),
    key: text("key").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    organizationId: uuid("organization_id").references(() => organization.id, {
      onDelete: "cascade",
    }),
    environment: text("environment").default("dev"),
    enabled: boolean("enabled").default(true),
    expiresAt: timestamp("expires_at"),
    requestCount: integer("request_count").default(0),
    lastRequest: timestamp("last_request"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("apikey_key_idx").on(table.key),
    index("apikey_user_id_idx").on(table.userId),
    index("apikey_organization_id_idx").on(table.organizationId),
  ]
)

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
    enabled: boolean("enabled").default(true).notNull(),
    retryCount: integer("retry_count").default(3).notNull(),
    timeoutMs: integer("timeout_ms").default(30000).notNull(),
    circuitState: text("circuit_state").default("closed").notNull(),
    failureCount: integer("failure_count").default(0).notNull(),
    lastFailureAt: timestamp("last_failure_at"),
    circuitOpenedAt: timestamp("circuit_opened_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("endpoint_organization_id_idx").on(table.organizationId)]
)

export const event = pgTable(
  "event",
  {
    id: uuid("id").primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    eventType: text("event_type").notNull(),
    payload: text("payload").notNull(),
    idempotencyKey: text("idempotency_key"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("event_organization_id_idx").on(table.organizationId),
    index("event_idempotency_key_idx").on(table.idempotencyKey),
  ]
)

export const delivery = pgTable(
  "delivery",
  {
    id: uuid("id").primaryKey(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => event.id, { onDelete: "cascade" }),
    endpointId: uuid("endpoint_id")
      .notNull()
      .references(() => endpoint.id, { onDelete: "cascade" }),
    status: text("status").default("pending").notNull(),
    attempts: integer("attempts").default(0).notNull(),
    nextAttemptAt: timestamp("next_attempt_at"),
    lastAttemptAt: timestamp("last_attempt_at"),
    responseStatus: integer("response_status"),
    responseBody: text("response_body"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("delivery_event_id_idx").on(table.eventId),
    index("delivery_endpoint_id_idx").on(table.endpointId),
    index("delivery_status_idx").on(table.status),
  ]
)

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
    forwardUrl: text("forward_url").notNull(),
    enabled: boolean("enabled").default(true).notNull(),
    retryCount: integer("retry_count").default(3).notNull(),
    timeoutMs: integer("timeout_ms").default(30000).notNull(),
    circuitState: text("circuit_state").default("closed").notNull(),
    failureCount: integer("failure_count").default(0).notNull(),
    lastFailureAt: timestamp("last_failure_at"),
    circuitOpenedAt: timestamp("circuit_opened_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("inbound_endpoint_organization_id_idx").on(table.organizationId),
  ]
)

export const inboundDelivery = pgTable(
  "inbound_delivery",
  {
    id: uuid("id").primaryKey(),
    inboundEndpointId: uuid("inbound_endpoint_id")
      .notNull()
      .references(() => inboundEndpoint.id, { onDelete: "cascade" }),
    payload: text("payload").notNull(),
    headers: text("headers"),
    status: text("status").default("pending").notNull(),
    attempts: integer("attempts").default(0).notNull(),
    lastAttemptAt: timestamp("last_attempt_at"),
    forwardedAt: timestamp("forwarded_at"),
    responseStatus: integer("response_status"),
    responseBody: text("response_body"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("inbound_delivery_endpoint_id_idx").on(table.inboundEndpointId),
    index("inbound_delivery_status_idx").on(table.status),
  ]
)
