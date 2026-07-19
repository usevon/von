TRUNCATE TABLE "delivery", "event", "inbound_delivery";
--> statement-breakpoint
ALTER TABLE "endpoint" RENAME COLUMN "retry_count" TO "max_attempts";
--> statement-breakpoint
ALTER TABLE "inbound_endpoint" RENAME COLUMN "retry_count" TO "max_attempts";
--> statement-breakpoint
ALTER TABLE "endpoint" ALTER COLUMN "max_attempts" SET DEFAULT 4;
--> statement-breakpoint
ALTER TABLE "inbound_endpoint" ALTER COLUMN "max_attempts" SET DEFAULT 4;
--> statement-breakpoint
ALTER TABLE "endpoint" ALTER COLUMN "version" TYPE text USING "version"::text;
--> statement-breakpoint
ALTER TABLE "webhook_version" ALTER COLUMN "version" TYPE text USING "version"::text;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "endpoint_org_status_idx" ON "endpoint" ("organization_id", "status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "event_org_type_created_idx" ON "event" ("organization_id", "event_type", "created_at", "id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "event_created_at_idx" ON "event" ("created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "delivery_event_created_id_idx" ON "delivery" ("event_id", "created_at", "id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "delivery_status_created_idx" ON "delivery" ("status", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "delivery_endpoint_status_created_idx" ON "delivery" ("endpoint_id", "status", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "delivery_created_at_idx" ON "delivery" ("created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inbound_endpoint_org_status_idx" ON "inbound_endpoint" ("organization_id", "status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inbound_delivery_created_at_idx" ON "inbound_delivery" ("created_at");
