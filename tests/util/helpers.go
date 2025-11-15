package util

import (
	"testing"
	"time"

	"github.com/usevon/von/internal/queue"
	"github.com/usevon/von/pkg/types"
)

// SetupQueue creates a test queue and handles cleanup.
func SetupQueue(t *testing.T) *queue.Queue {
	t.Helper()

	q, err := queue.NewQueue(GetRabbitMQURL())
	if err != nil {
		t.Fatalf("failed to create queue: %v", err)
	}

	t.Cleanup(func() {
		q.Close()
	})

	return q
}

// NewTestMessage creates a test QueueMessage with sensible defaults.
// Pass functional options to override specific fields.
func NewTestMessage(opts ...func(*types.QueueMessage)) types.QueueMessage {
	msg := types.QueueMessage{
		DeliveryID:    "test-delivery-" + time.Now().Format("20060102-150405"),
		EventID:       "test-event",
		EndpointID:    "test-endpoint",
		URL:           "https://example.com/webhook",
		EventType:     "test.event",
		Payload:       map[string]interface{}{},
		Headers:       map[string]string{},
		AttemptNumber: 1,
		DeliveryMode:  types.DeliveryModeAsync,
		MaxRetries:    3,
		RetryStrategy: types.RetryStrategyExponential,
		EnqueuedAt:    time.Now(),
	}

	for _, opt := range opts {
		opt(&msg)
	}

	return msg
}

// WithDeliveryID sets the delivery ID.
func WithDeliveryID(id string) func(*types.QueueMessage) {
	return func(m *types.QueueMessage) {
		m.DeliveryID = id
	}
}

// WithEventType sets the event type.
func WithEventType(eventType string) func(*types.QueueMessage) {
	return func(m *types.QueueMessage) {
		m.EventType = eventType
	}
}

// WithPayload sets the payload.
func WithPayload(payload map[string]interface{}) func(*types.QueueMessage) {
	return func(m *types.QueueMessage) {
		m.Payload = payload
	}
}

// WithMaxRetries sets the max retries.
func WithMaxRetries(n int) func(*types.QueueMessage) {
	return func(m *types.QueueMessage) {
		m.MaxRetries = n
	}
}
