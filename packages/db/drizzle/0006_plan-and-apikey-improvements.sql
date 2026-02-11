ALTER TABLE "organization" ADD COLUMN "plan" text NOT NULL DEFAULT 'hobby';
ALTER TABLE "apikey" ALTER COLUMN "scopes" TYPE jsonb USING scopes::jsonb;
DROP INDEX IF EXISTS "apikey_key_idx";
CREATE UNIQUE INDEX "apikey_key_uidx" ON "apikey" ("key");
