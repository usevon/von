DROP INDEX IF EXISTS "apikey_key_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "delivery_endpoint_id_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "delivery_status_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "endpoint_organization_id_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "event_organization_id_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "inbound_delivery_status_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "inbound_endpoint_organization_id_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "webhook_version_organization_id_idx";--> statement-breakpoint
ALTER TABLE "endpoint" ALTER COLUMN "version" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "event" ALTER COLUMN "payload" SET DATA TYPE jsonb USING payload::jsonb;--> statement-breakpoint
ALTER TABLE "inbound_delivery" ALTER COLUMN "payload" SET DATA TYPE jsonb USING payload::jsonb;--> statement-breakpoint
ALTER TABLE "inbound_delivery" ALTER COLUMN "headers" SET DATA TYPE jsonb USING headers::jsonb;--> statement-breakpoint
ALTER TABLE "webhook_version" ALTER COLUMN "version" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "apikey" ADD COLUMN IF NOT EXISTS "scopes" jsonb;--> statement-breakpoint
ALTER TABLE "apikey" ADD COLUMN IF NOT EXISTS "last_used_at" timestamp;--> statement-breakpoint
ALTER TABLE "delivery" ADD COLUMN IF NOT EXISTS "response" jsonb;--> statement-breakpoint
ALTER TABLE "endpoint" ADD COLUMN IF NOT EXISTS "previous_secret" text;--> statement-breakpoint
ALTER TABLE "endpoint" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "endpoint" ADD COLUMN IF NOT EXISTS "max_attempts" integer DEFAULT 4 NOT NULL;--> statement-breakpoint
ALTER TABLE "endpoint" ADD COLUMN IF NOT EXISTS "last_success_at" timestamp;--> statement-breakpoint
ALTER TABLE "inbound_delivery" ADD COLUMN IF NOT EXISTS "response" jsonb;--> statement-breakpoint
ALTER TABLE "inbound_endpoint" ADD COLUMN IF NOT EXISTS "previous_secret" text;--> statement-breakpoint
ALTER TABLE "inbound_endpoint" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "inbound_endpoint" ADD COLUMN IF NOT EXISTS "max_attempts" integer DEFAULT 4 NOT NULL;--> statement-breakpoint
ALTER TABLE "inbound_endpoint" ADD COLUMN IF NOT EXISTS "last_success_at" timestamp;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN IF NOT EXISTS "plan" text DEFAULT 'hobby' NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "normalized_email" text;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "apikey_key_uidx" ON "apikey" USING btree ("key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "delivery_endpoint_status_idx" ON "delivery" USING btree ("endpoint_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "delivery_event_created_id_idx" ON "delivery" USING btree ("event_id","created_at","id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "delivery_status_created_idx" ON "delivery" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "delivery_endpoint_status_created_idx" ON "delivery" USING btree ("endpoint_id","status","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "delivery_created_at_idx" ON "delivery" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "endpoint_org_created_id_idx" ON "endpoint" USING btree ("organization_id","created_at","id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "endpoint_org_status_idx" ON "endpoint" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "event_org_created_id_idx" ON "event" USING btree ("organization_id","created_at","id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "event_org_type_created_idx" ON "event" USING btree ("organization_id","event_type","created_at","id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "event_created_at_idx" ON "event" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inbound_delivery_endpoint_status_idx" ON "inbound_delivery" USING btree ("inbound_endpoint_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inbound_delivery_created_at_idx" ON "inbound_delivery" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inbound_endpoint_org_created_id_idx" ON "inbound_endpoint" USING btree ("organization_id","created_at","id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inbound_endpoint_org_status_idx" ON "inbound_endpoint" USING btree ("organization_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "organization_slug_uidx" ON "organization" USING btree ("slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "webhook_version_org_created_id_idx" ON "webhook_version" USING btree ("organization_id","created_at","id");--> statement-breakpoint
ALTER TABLE "delivery" DROP COLUMN IF EXISTS "next_attempt_at";--> statement-breakpoint
ALTER TABLE "delivery" DROP COLUMN IF EXISTS "response_status";--> statement-breakpoint
ALTER TABLE "delivery" DROP COLUMN IF EXISTS "response_body";--> statement-breakpoint
ALTER TABLE "delivery" DROP COLUMN IF EXISTS "updated_at";--> statement-breakpoint
ALTER TABLE "endpoint" DROP COLUMN IF EXISTS "enabled";--> statement-breakpoint
ALTER TABLE "endpoint" DROP COLUMN IF EXISTS "retry_count";--> statement-breakpoint
ALTER TABLE "inbound_delivery" DROP COLUMN IF EXISTS "response_status";--> statement-breakpoint
ALTER TABLE "inbound_delivery" DROP COLUMN IF EXISTS "response_body";--> statement-breakpoint
ALTER TABLE "inbound_endpoint" DROP COLUMN IF EXISTS "enabled";--> statement-breakpoint
ALTER TABLE "inbound_endpoint" DROP COLUMN IF EXISTS "retry_count";--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "user" ADD CONSTRAINT "user_normalized_email_unique" UNIQUE("normalized_email");
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
