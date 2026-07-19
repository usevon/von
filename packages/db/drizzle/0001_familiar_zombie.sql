CREATE TABLE "device_code" (
	"id" uuid PRIMARY KEY NOT NULL,
	"device_code" text NOT NULL,
	"user_code" text NOT NULL,
	"user_id" uuid,
	"client_id" text,
	"scope" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"last_polled_at" timestamp,
	"polling_interval" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tunnel" (
	"id" text PRIMARY KEY NOT NULL,
	"secret" text NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"port" integer NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_ping_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "webhook_version" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"version" date NOT NULL,
	"transforms" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "webhook_version_org_version_unique" UNIQUE("organization_id","version")
);
--> statement-breakpoint
DROP INDEX "event_idempotency_key_idx";--> statement-breakpoint
ALTER TABLE "apikey" ALTER COLUMN "name" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "apikey" ALTER COLUMN "start" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "apikey" ALTER COLUMN "environment" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "apikey" ALTER COLUMN "environment" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "endpoint" ADD COLUMN "version" date;--> statement-breakpoint
ALTER TABLE "endpoint" ADD COLUMN "events" text[];--> statement-breakpoint
ALTER TABLE "device_code" ADD CONSTRAINT "device_code_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tunnel" ADD CONSTRAINT "tunnel_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tunnel" ADD CONSTRAINT "tunnel_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_version" ADD CONSTRAINT "webhook_version_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "device_code_device_code_idx" ON "device_code" USING btree ("device_code");--> statement-breakpoint
CREATE INDEX "device_code_user_code_idx" ON "device_code" USING btree ("user_code");--> statement-breakpoint
CREATE INDEX "tunnel_organization_id_idx" ON "tunnel" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "tunnel_user_id_idx" ON "tunnel" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "webhook_version_organization_id_idx" ON "webhook_version" USING btree ("organization_id");--> statement-breakpoint
ALTER TABLE "apikey" DROP COLUMN "request_count";--> statement-breakpoint
ALTER TABLE "apikey" DROP COLUMN "last_request";--> statement-breakpoint
ALTER TABLE "event" ADD CONSTRAINT "event_org_idempotency_unique" UNIQUE("organization_id","idempotency_key");