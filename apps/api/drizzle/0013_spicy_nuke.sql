CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"actor_id" uuid,
	"actor_type" text NOT NULL,
	"action" text NOT NULL,
	"resource_type" text NOT NULL,
	"resource_id" text NOT NULL,
	"resource_name" text,
	"metadata" jsonb,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "delivery_attempt" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"delivery_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"endpoint_id" uuid NOT NULL,
	"attempt_number" integer NOT NULL,
	"outcome" text NOT NULL,
	"is_final" boolean DEFAULT false NOT NULL,
	"http_status" integer,
	"error" text,
	"duration_ms" integer NOT NULL,
	"started_at" timestamp NOT NULL,
	"finished_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "delivery_attempt_delivery_number_unique" UNIQUE("delivery_id","attempt_number")
);
--> statement-breakpoint
DROP INDEX "apikey_key_idx";--> statement-breakpoint
DROP INDEX "delivery_endpoint_id_idx";--> statement-breakpoint
DROP INDEX "delivery_status_idx";--> statement-breakpoint
DROP INDEX "endpoint_organization_id_idx";--> statement-breakpoint
DROP INDEX "event_organization_id_idx";--> statement-breakpoint
DROP INDEX "inbound_delivery_status_idx";--> statement-breakpoint
DROP INDEX "inbound_endpoint_organization_id_idx";--> statement-breakpoint
DROP INDEX "webhook_version_organization_id_idx";--> statement-breakpoint
ALTER TABLE "endpoint" ALTER COLUMN "version" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "event" ALTER COLUMN "payload" SET DATA TYPE jsonb USING payload::jsonb;--> statement-breakpoint
ALTER TABLE "inbound_delivery" ALTER COLUMN "payload" SET DATA TYPE jsonb USING payload::jsonb;--> statement-breakpoint
ALTER TABLE "inbound_delivery" ALTER COLUMN "headers" SET DATA TYPE jsonb USING headers::jsonb;--> statement-breakpoint
ALTER TABLE "webhook_version" ALTER COLUMN "version" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "apikey" ADD COLUMN "scopes" jsonb;--> statement-breakpoint
ALTER TABLE "apikey" ADD COLUMN "last_used_at" timestamp;--> statement-breakpoint
ALTER TABLE "delivery" ADD COLUMN "response" jsonb;--> statement-breakpoint
ALTER TABLE "endpoint" ADD COLUMN "previous_secret" text;--> statement-breakpoint
ALTER TABLE "endpoint" ADD COLUMN "status" text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "endpoint" ADD COLUMN "max_attempts" integer DEFAULT 4 NOT NULL;--> statement-breakpoint
ALTER TABLE "endpoint" ADD COLUMN "last_success_at" timestamp;--> statement-breakpoint
ALTER TABLE "inbound_delivery" ADD COLUMN "response" jsonb;--> statement-breakpoint
ALTER TABLE "inbound_endpoint" ADD COLUMN "previous_secret" text;--> statement-breakpoint
ALTER TABLE "inbound_endpoint" ADD COLUMN "status" text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "inbound_endpoint" ADD COLUMN "max_attempts" integer DEFAULT 4 NOT NULL;--> statement-breakpoint
ALTER TABLE "inbound_endpoint" ADD COLUMN "last_success_at" timestamp;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "plan" text DEFAULT 'hobby' NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "normalized_email" text;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_attempt" ADD CONSTRAINT "delivery_attempt_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_attempt" ADD CONSTRAINT "delivery_attempt_delivery_id_delivery_id_fk" FOREIGN KEY ("delivery_id") REFERENCES "public"."delivery"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_attempt" ADD CONSTRAINT "delivery_attempt_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_attempt" ADD CONSTRAINT "delivery_attempt_endpoint_id_endpoint_id_fk" FOREIGN KEY ("endpoint_id") REFERENCES "public"."endpoint"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_log_org_created_idx" ON "audit_log" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_log_org_action_idx" ON "audit_log" USING btree ("organization_id","action");--> statement-breakpoint
CREATE INDEX "audit_log_expires_at_idx" ON "audit_log" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "delivery_attempt_delivery_number_idx" ON "delivery_attempt" USING btree ("delivery_id","attempt_number");--> statement-breakpoint
CREATE INDEX "delivery_attempt_org_created_id_idx" ON "delivery_attempt" USING btree ("organization_id","created_at","id");--> statement-breakpoint
CREATE INDEX "delivery_attempt_endpoint_created_id_idx" ON "delivery_attempt" USING btree ("endpoint_id","created_at","id");--> statement-breakpoint
CREATE INDEX "delivery_attempt_outcome_created_idx" ON "delivery_attempt" USING btree ("outcome","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "apikey_key_uidx" ON "apikey" USING btree ("key");--> statement-breakpoint
CREATE INDEX "delivery_endpoint_status_idx" ON "delivery" USING btree ("endpoint_id","status");--> statement-breakpoint
CREATE INDEX "delivery_event_created_id_idx" ON "delivery" USING btree ("event_id","created_at","id");--> statement-breakpoint
CREATE INDEX "delivery_status_created_idx" ON "delivery" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "delivery_endpoint_status_created_idx" ON "delivery" USING btree ("endpoint_id","status","created_at");--> statement-breakpoint
CREATE INDEX "delivery_created_at_idx" ON "delivery" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "endpoint_org_created_id_idx" ON "endpoint" USING btree ("organization_id","created_at","id");--> statement-breakpoint
CREATE INDEX "endpoint_org_status_idx" ON "endpoint" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "event_org_created_id_idx" ON "event" USING btree ("organization_id","created_at","id");--> statement-breakpoint
CREATE INDEX "event_org_type_created_idx" ON "event" USING btree ("organization_id","event_type","created_at","id");--> statement-breakpoint
CREATE INDEX "event_created_at_idx" ON "event" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "inbound_delivery_endpoint_status_idx" ON "inbound_delivery" USING btree ("inbound_endpoint_id","status");--> statement-breakpoint
CREATE INDEX "inbound_delivery_created_at_idx" ON "inbound_delivery" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "inbound_endpoint_org_created_id_idx" ON "inbound_endpoint" USING btree ("organization_id","created_at","id");--> statement-breakpoint
CREATE INDEX "inbound_endpoint_org_status_idx" ON "inbound_endpoint" USING btree ("organization_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "organization_slug_uidx" ON "organization" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "webhook_version_org_created_id_idx" ON "webhook_version" USING btree ("organization_id","created_at","id");--> statement-breakpoint
ALTER TABLE "delivery" DROP COLUMN "next_attempt_at";--> statement-breakpoint
ALTER TABLE "delivery" DROP COLUMN "response_status";--> statement-breakpoint
ALTER TABLE "delivery" DROP COLUMN "response_body";--> statement-breakpoint
ALTER TABLE "delivery" DROP COLUMN "updated_at";--> statement-breakpoint
ALTER TABLE "endpoint" DROP COLUMN "enabled";--> statement-breakpoint
ALTER TABLE "endpoint" DROP COLUMN "retry_count";--> statement-breakpoint
ALTER TABLE "inbound_delivery" DROP COLUMN "response_status";--> statement-breakpoint
ALTER TABLE "inbound_delivery" DROP COLUMN "response_body";--> statement-breakpoint
ALTER TABLE "inbound_endpoint" DROP COLUMN "enabled";--> statement-breakpoint
ALTER TABLE "inbound_endpoint" DROP COLUMN "retry_count";--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_normalized_email_unique" UNIQUE("normalized_email");