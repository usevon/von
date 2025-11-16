package worker

import (
	"context"
	"encoding/json"
	"log"
	"sync/atomic"

	"github.com/usevon/von/internal/queue"
	"github.com/usevon/von/pkg/types"
)

// PoisonQueueMonitor monitors the dead letter queue for failed messages.
type PoisonQueueMonitor struct {
	consumer           *queue.Consumer
	failedMessageCount atomic.Int64
	onMessage          func(msg types.QueueMessage, reason string)
}

// NewPoisonQueueMonitor creates a monitor for the poison queue (DLX).
func NewPoisonQueueMonitor(rabbitmqURL string, onMessage func(msg types.QueueMessage, reason string)) (*PoisonQueueMonitor, error) {
	monitor := &PoisonQueueMonitor{
		onMessage: onMessage,
	}

	consumer, err := queue.NewDLXConsumer(rabbitmqURL, monitor.handlePoisonMessage)
	if err != nil {
		return nil, err
	}

	monitor.consumer = consumer
	return monitor, nil
}

// handlePoisonMessage processes messages from the dead letter queue.
func (m *PoisonQueueMonitor) handlePoisonMessage(ctx context.Context, msg types.QueueMessage) error {
	m.failedMessageCount.Add(1)

	log.Printf("[POISON_QUEUE] Failed message detected - DeliveryID: %s, EventID: %s, EndpointID: %s, Attempts: %d",
		msg.DeliveryID, msg.EventID, msg.EndpointID, msg.AttemptNumber)

	payloadJSON, _ := json.Marshal(msg.Payload)
	log.Printf("[POISON_QUEUE] Payload: %s", string(payloadJSON))

	if m.onMessage != nil {
		m.onMessage(msg, "max_retries_exceeded")
	}

	return nil
}

// GetFailedMessageCount returns the total count of failed messages.
func (m *PoisonQueueMonitor) GetFailedMessageCount() int64 {
	return m.failedMessageCount.Load()
}

// Close shuts down the poison queue monitor.
func (m *PoisonQueueMonitor) Close() {
	m.consumer.Close()
}
