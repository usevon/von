-- Per attempt diagnostics the dashboard events tab surfaces as timing bars and a response preview.
ALTER TABLE delivery_attempt ADD COLUMN IF NOT EXISTS queue_ms integer;
ALTER TABLE delivery_attempt ADD COLUMN IF NOT EXISTS ttfb_ms integer;
ALTER TABLE delivery_attempt ADD COLUMN IF NOT EXISTS transfer_ms integer;
ALTER TABLE delivery_attempt ADD COLUMN IF NOT EXISTS response_body text;
ALTER TABLE delivery_attempt ADD COLUMN IF NOT EXISTS request_headers jsonb;
