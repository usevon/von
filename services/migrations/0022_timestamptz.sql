-- The services write now() in SQL, so a non UTC session would split the clock on naive columns.
-- Existing values were always written as UTC, which the USING clause preserves.
ALTER TABLE event ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC';
ALTER TABLE delivery ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC';
ALTER TABLE delivery ALTER COLUMN last_attempt_at TYPE timestamptz USING last_attempt_at AT TIME ZONE 'UTC';
ALTER TABLE delivery_attempt ALTER COLUMN started_at TYPE timestamptz USING started_at AT TIME ZONE 'UTC';
ALTER TABLE delivery_attempt ALTER COLUMN finished_at TYPE timestamptz USING finished_at AT TIME ZONE 'UTC';
ALTER TABLE delivery_attempt ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC';
ALTER TABLE endpoint ALTER COLUMN last_failure_at TYPE timestamptz USING last_failure_at AT TIME ZONE 'UTC';
ALTER TABLE endpoint ALTER COLUMN last_success_at TYPE timestamptz USING last_success_at AT TIME ZONE 'UTC';
ALTER TABLE endpoint ALTER COLUMN circuit_opened_at TYPE timestamptz USING circuit_opened_at AT TIME ZONE 'UTC';
ALTER TABLE endpoint ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC';
ALTER TABLE endpoint ALTER COLUMN updated_at TYPE timestamptz USING updated_at AT TIME ZONE 'UTC';
ALTER TABLE inbound_delivery ALTER COLUMN last_attempt_at TYPE timestamptz USING last_attempt_at AT TIME ZONE 'UTC';
ALTER TABLE inbound_delivery ALTER COLUMN forwarded_at TYPE timestamptz USING forwarded_at AT TIME ZONE 'UTC';
ALTER TABLE inbound_delivery ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC';
ALTER TABLE inbound_endpoint ALTER COLUMN last_failure_at TYPE timestamptz USING last_failure_at AT TIME ZONE 'UTC';
ALTER TABLE inbound_endpoint ALTER COLUMN last_success_at TYPE timestamptz USING last_success_at AT TIME ZONE 'UTC';
ALTER TABLE inbound_endpoint ALTER COLUMN circuit_opened_at TYPE timestamptz USING circuit_opened_at AT TIME ZONE 'UTC';
ALTER TABLE inbound_endpoint ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC';
ALTER TABLE inbound_endpoint ALTER COLUMN updated_at TYPE timestamptz USING updated_at AT TIME ZONE 'UTC';
ALTER TABLE tunnel ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC';
ALTER TABLE webhook_version ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC';
ALTER TABLE webhook_version ALTER COLUMN updated_at TYPE timestamptz USING updated_at AT TIME ZONE 'UTC';
