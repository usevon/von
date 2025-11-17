package types

import (
	"errors"
	"time"
)

// IsTerminal returns true if the delivery status is in a final state (Delivered, Failed, or Cancelled).
func (s DeliveryStatus) IsTerminal() bool {
	return s == DeliveryStatusDelivered || s == DeliveryStatusFailed || s == DeliveryStatusCancelled
}

// CanRetry returns true if the delivery can be retried (only queued deliveries).
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

// ExtractCurrentSecret extracts the current secret from endpoint secrets.
// Returns "default-secret" if no secret is found.
func ExtractCurrentSecret(secrets JSONB) string {
	if secrets == nil {
		return "default-secret"
	}

	if currentSecret, ok := secrets["current"].(string); ok {
		return currentSecret
	}

	return "default-secret"
}

// ToMap converts a JSONB object to a map[string]string.
// Non-string values are ignored.
func (j JSONB) ToMap() map[string]string {
	result := make(map[string]string)

	for k, v := range j {
		if str, ok := v.(string); ok {
			result[k] = str
		}
	}

	return result
}

// NewQueueMessage creates a new QueueMessage from an event, endpoint, and delivery.
func NewQueueMessage(event *Event, endpoint *Endpoint, delivery *EventDelivery) QueueMessage {
	return QueueMessage{
		DeliveryID:     delivery.ID,
		EventID:        event.ID,
		EndpointID:     endpoint.ID,
		OrganizationID: event.OrganizationID,
		URL:            endpoint.URL,
		EventType:      event.EventType,
		Payload:        event.Payload,
		Headers:        endpoint.CustomHeaders.ToMap(),
		Secret:         ExtractCurrentSecret(endpoint.Secrets),
		AttemptNumber:  1,
		DeliveryMode:   event.DeliveryMode,
		MaxRetries:     endpoint.MaxRetries,
		RetryStrategy:  endpoint.RetryStrategy,
		EnqueuedAt:     time.Now(),
	}
}
