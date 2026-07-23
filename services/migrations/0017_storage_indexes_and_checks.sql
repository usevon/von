-- Each dropped index is a strict prefix of a wider one, so it only cost writes on the hot tables.
DROP INDEX IF EXISTS delivery_attempt_delivery_number_idx;
DROP INDEX IF EXISTS delivery_event_id_idx;
DROP INDEX IF EXISTS delivery_endpoint_status_idx;
DROP INDEX IF EXISTS inbound_delivery_endpoint_id_idx;

-- A CHECK is the structural guard against a writer drifting to a status no reader understands.
ALTER TABLE delivery ADD CONSTRAINT delivery_status_check
  CHECK (status IN ('pending', 'delivered', 'failed', 'paused', 'skipped', 'circuit_open'));
ALTER TABLE inbound_delivery ADD CONSTRAINT inbound_delivery_status_check
  CHECK (status IN ('pending', 'forwarded', 'failed'));
ALTER TABLE endpoint ADD CONSTRAINT endpoint_circuit_state_check
  CHECK (circuit_state IN ('open', 'closed', 'half_open'));
ALTER TABLE delivery_attempt ADD CONSTRAINT delivery_attempt_outcome_check
  CHECK (outcome IN ('success', 'failure', 'timeout'));
