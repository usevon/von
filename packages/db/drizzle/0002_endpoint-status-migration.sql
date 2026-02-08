-- 1. Drop next_attempt_at from delivery
ALTER TABLE "delivery" DROP COLUMN "next_attempt_at";--> statement-breakpoint

-- 2. Add last_success_at to endpoint and inbound_endpoint
ALTER TABLE "endpoint" ADD COLUMN "last_success_at" timestamp;--> statement-breakpoint
ALTER TABLE "inbound_endpoint" ADD COLUMN "last_success_at" timestamp;--> statement-breakpoint

-- 3. Replace enabled boolean with status text on endpoint
ALTER TABLE "endpoint" ADD COLUMN "status" text DEFAULT 'active' NOT NULL;--> statement-breakpoint
UPDATE "endpoint" SET "status" = CASE WHEN "enabled" = true THEN 'active' ELSE 'disabled' END;--> statement-breakpoint
ALTER TABLE "endpoint" DROP COLUMN "enabled";--> statement-breakpoint

-- 4. Replace enabled boolean with status text on inbound_endpoint
ALTER TABLE "inbound_endpoint" ADD COLUMN "status" text DEFAULT 'active' NOT NULL;--> statement-breakpoint
UPDATE "inbound_endpoint" SET "status" = CASE WHEN "enabled" = true THEN 'active' ELSE 'disabled' END;--> statement-breakpoint
ALTER TABLE "inbound_endpoint" DROP COLUMN "enabled";
