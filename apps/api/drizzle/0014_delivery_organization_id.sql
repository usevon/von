ALTER TABLE "delivery" ADD COLUMN IF NOT EXISTS "organization_id" uuid;--> statement-breakpoint
UPDATE "delivery" SET "organization_id" = (SELECT "organization_id" FROM "event" WHERE "event"."id" = "delivery"."event_id") WHERE "organization_id" IS NULL;--> statement-breakpoint
ALTER TABLE "delivery" ALTER COLUMN "organization_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "delivery" ADD CONSTRAINT "delivery_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "delivery_org_created_id_idx" ON "delivery" USING btree ("organization_id","created_at","id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "delivery_org_status_created_idx" ON "delivery" USING btree ("organization_id","status","created_at");
