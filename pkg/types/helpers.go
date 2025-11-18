package types

import (
	"time"
)

// NewQueueMessage creates a new QueueMessage from an event, endpoint, and delivery.
func NewQueueMessage(event *Event, endpoint *Endpoint, delivery *EventDelivery) QueueMessage {
	// Extract current secret from endpoint secrets
	secret := "default-secret"
	if endpoint.Secrets != nil {
		if currentSecret, ok := endpoint.Secrets["current"].(string); ok {
			secret = currentSecret
		}
	}

	// Convert custom headers JSONB to map[string]string
	headers := make(map[string]string)
	for k, v := range endpoint.CustomHeaders {
		if str, ok := v.(string); ok {
			headers[k] = str
		}
	}

	return QueueMessage{
		DeliveryID:     delivery.ID,
		EventID:        event.ID,
		EndpointID:     endpoint.ID,
		OrganizationID: event.OrganizationID,
		URL:            endpoint.URL,
		EventType:      event.EventType,
		Payload:        event.Payload,
		Headers:        headers,
		Secret:         secret,
		AttemptNumber:  1,
		DeliveryMode:   event.DeliveryMode,
		MaxRetries:     endpoint.MaxRetries,
		RetryStrategy:  endpoint.RetryStrategy,
		EnqueuedAt:     time.Now(),
	}
}
