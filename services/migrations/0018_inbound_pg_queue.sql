-- The pending inbound_delivery row is the queue now, polled the same way as delivery.
ALTER TABLE inbound_delivery ADD COLUMN next_attempt_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX inbound_delivery_pending_poll_idx ON inbound_delivery (next_attempt_at) WHERE status = 'pending';
