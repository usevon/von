-- 1. Delivery response consolidation
ALTER TABLE "delivery" ADD COLUMN "response" jsonb;
ALTER TABLE "delivery" DROP COLUMN "response_status";
ALTER TABLE "delivery" DROP COLUMN "response_body";
ALTER TABLE "delivery" DROP COLUMN "updated_at";

ALTER TABLE "inbound_delivery" ADD COLUMN "response" jsonb;
ALTER TABLE "inbound_delivery" DROP COLUMN "response_status";
ALTER TABLE "inbound_delivery" DROP COLUMN "response_body";

-- 2. Compound indexes
DROP INDEX "delivery_endpoint_id_idx";
DROP INDEX "delivery_status_idx";
CREATE INDEX "delivery_endpoint_status_idx" ON "delivery" ("endpoint_id", "status");

DROP INDEX "inbound_delivery_status_idx";
CREATE INDEX "inbound_delivery_endpoint_status_idx" ON "inbound_delivery" ("inbound_endpoint_id", "status");

DROP INDEX "event_organization_id_idx";
CREATE INDEX "event_org_created_idx" ON "event" ("organization_id", "created_at");

-- 3. Dual-hash secret rotation
ALTER TABLE "endpoint" ADD COLUMN "previous_secret" text;
ALTER TABLE "inbound_endpoint" ADD COLUMN "previous_secret" text;
