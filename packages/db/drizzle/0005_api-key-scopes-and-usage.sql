ALTER TABLE "apikey" ADD COLUMN "scopes" text;
ALTER TABLE "apikey" ADD COLUMN "last_used_at" timestamp;
