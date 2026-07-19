CREATE INDEX IF NOT EXISTS "event_org_created_id_idx" ON "event" ("organization_id", "created_at", "id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "endpoint_org_created_id_idx" ON "endpoint" ("organization_id", "created_at", "id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inbound_endpoint_org_created_id_idx" ON "inbound_endpoint" ("organization_id", "created_at", "id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "webhook_version_org_created_id_idx" ON "webhook_version" ("organization_id", "created_at", "id");
--> statement-breakpoint
DROP INDEX IF EXISTS "event_org_created_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "endpoint_organization_id_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "inbound_endpoint_organization_id_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "webhook_version_organization_id_idx";
