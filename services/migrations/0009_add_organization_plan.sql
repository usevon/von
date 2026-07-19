ALTER TABLE "organization"
ADD COLUMN IF NOT EXISTS "plan" text DEFAULT 'hobby';
--> statement-breakpoint
UPDATE "organization"
SET "plan" = 'hobby'
WHERE "plan" IS NULL;
--> statement-breakpoint
ALTER TABLE "organization"
ALTER COLUMN "plan" SET NOT NULL;
