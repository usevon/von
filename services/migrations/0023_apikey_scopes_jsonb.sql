ALTER TABLE "apikey" ALTER COLUMN "scopes" SET DATA TYPE jsonb USING scopes::jsonb;
