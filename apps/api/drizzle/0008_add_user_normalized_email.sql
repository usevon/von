ALTER TABLE "user"
ADD COLUMN IF NOT EXISTS "normalized_email" text;
