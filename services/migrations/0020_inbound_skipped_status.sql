-- An inbound delivery whose endpoint went inactive is skipped instead of polled forever.
ALTER TABLE inbound_delivery DROP CONSTRAINT inbound_delivery_status_check;
ALTER TABLE inbound_delivery ADD CONSTRAINT inbound_delivery_status_check
  CHECK (status IN ('pending', 'forwarded', 'failed', 'skipped'));
