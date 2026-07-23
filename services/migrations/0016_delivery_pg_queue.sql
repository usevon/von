-- The pending delivery row is the queue now, polled with SELECT FOR UPDATE SKIP LOCKED.
ALTER TABLE delivery ADD COLUMN next_attempt_at timestamptz NOT NULL DEFAULT now();

-- The partial predicate keeps the poll index to the backlog, not the terminal rows.
CREATE INDEX delivery_pending_poll_idx ON delivery (next_attempt_at) WHERE status = 'pending';
