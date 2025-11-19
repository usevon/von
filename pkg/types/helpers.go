package types

import (
	"time"
)

// ExtractCurrentSecret extracts the current secret from a JSONB secrets field.
func ExtractCurrentSecret(secrets JSONB) string {
	if secrets == nil {
		return "default-secret"
	}
	if currentSecret, ok := secrets["current"].(string); ok {
		return currentSecret
	}
	return "default-secret"
}

// ToMap converts a JSONB to a map[string]string, ignoring non-string values.
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
