ALTER TABLE "event" ALTER COLUMN "payload" TYPE jsonb USING payload::jsonb;--> statement-breakpoint
ALTER TABLE "inbound_delivery" ALTER COLUMN "payload" TYPE jsonb USING payload::jsonb;--> statement-breakpoint
ALTER TABLE "inbound_delivery" ALTER COLUMN "headers" TYPE jsonb USING headers::jsonb;
