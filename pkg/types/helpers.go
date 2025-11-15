package types

import "errors"

// IsTerminal returns true if the delivery status is in a final state.
// Terminal states are: Delivered, Failed, or Cancelled.
func (s DeliveryStatus) IsTerminal() bool {
	return s == DeliveryStatusDelivered || s == DeliveryStatusFailed || s == DeliveryStatusCancelled
}

// CanRetry returns true if the delivery is in a state where retries are possible.
// Only queued deliveries can be retried.
func (s DeliveryStatus) CanRetry() bool {
	return s == DeliveryStatusQueued
}

// IsHealthy returns true if the endpoint is in a healthy state.
func (s EndpointStatus) IsHealthy() bool {
	return s == EndpointStatusHealthy
}

// IsUnhealthy returns true if the endpoint is failing, degraded, or disabled.
func (s EndpointStatus) IsUnhealthy() bool {
	return s == EndpointStatusFailing || s == EndpointStatusDegraded || s == EndpointStatusDisabled
}

// NeedsAttention returns true if the endpoint is degraded or failing.
func (s EndpointStatus) NeedsAttention() bool {
	return s == EndpointStatusDegraded || s == EndpointStatusFailing
}

// Validate checks if a QueueMessage has all required fields.
func (q *QueueMessage) Validate() error {
	if q.DeliveryID == "" {
		return errors.New("delivery_id is required")
	}
	if q.EventID == "" {
		return errors.New("event_id is required")
	}
	if q.EndpointID == "" {
		return errors.New("endpoint_id is required")
	}
	if q.URL == "" {
		return errors.New("url is required")
	}
	if q.MaxRetries < 0 {
		return errors.New("max_retries cannot be negative")
	}
	if q.AttemptNumber < 1 {
		return errors.New("attempt_number must be at least 1")
	}
	return nil
}

// Validate checks if an Endpoint has all required fields.
func (e *Endpoint) Validate() error {
	if e.ID == "" {
		return errors.New("id is required")
	}
	if e.ApplicationID == "" {
		return errors.New("application_id is required")
	}
	if e.URL == "" {
		return errors.New("url is required")
	}
	if e.SigningAlgo != SignatureAlgoSHA256 && e.SigningAlgo != SignatureAlgoSHA512 {
		return errors.New("signing_algo must be SHA256 or SHA512")
	}
	if e.TimeoutSeconds <= 0 {
		return errors.New("timeout_seconds must be positive")
	}
	if e.MaxRetries < 0 {
		return errors.New("max_retries cannot be negative")
	}
	return nil
}

// Validate checks if an Event has all required fields.
func (e *Event) Validate() error {
	if e.ID == "" {
		return errors.New("id is required")
	}
	if e.ApplicationID == "" {
		return errors.New("application_id is required")
	}
	if e.OrganizationID == "" {
		return errors.New("organization_id is required")
	}
	if e.EventType == "" {
		return errors.New("event_type is required")
	}
	return nil
}
