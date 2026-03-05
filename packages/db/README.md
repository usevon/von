# @usevon/db

Database layer for Von, built on Drizzle ORM with PostgreSQL.

## Usage

```typescript
import { db, eq } from "@usevon/db"
import { endpoint, event } from "@usevon/db/schema"

const endpoints = await db.query.endpoint.findMany({
  where: eq(endpoint.organizationId, orgId),
})
```

The root export provides the database instance, re-exported Drizzle operators (`eq`, `and`, `or`, `inArray`, `sql`), and all schema definitions. The `@usevon/db/schema` sub-path exports only the table definitions and relations without pulling in the database connection.

## Schema

17 tables across four domains:

- Auth and identity (user, session, account, verification, organization, member)
- Outbound webhooks (endpoint, event, delivery, deliveryAttempt, webhookVersion)
- Inbound webhooks (inboundEndpoint, inboundDelivery)
- Infrastructure (apikey, invitation, deviceCode, tunnel, auditLog)

## Health Check

```typescript
import { checkDatabaseConnection, closeDatabase } from "@usevon/db"

const { ok } = await checkDatabaseConnection()

// Graceful shutdown
await closeDatabase()
```

## Migrations

Migrations are managed via Drizzle Kit in `apps/api`:

```bash
bun run --cwd apps/api db:push
```

## License

AGPL-3.0 - see [LICENSE-AGPL](../../LICENSE-AGPL)
