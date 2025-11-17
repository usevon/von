package worker_test

import (
	"context"
	"os"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/usevon/von/internal/queue"
	"github.com/usevon/von/internal/worker"
	"github.com/usevon/von/pkg/types"
)

func TestPoisonQueueMonitor_Basic(t *testing.T) {
	rabbitmqURL := os.Getenv("RABBITMQ_URL")
	if rabbitmqURL == "" {
		rabbitmqURL = "amqp://von:von_dev_password@localhost:5672/"
	}

	if err := queue.EnsureQueues(rabbitmqURL); err != nil {
		t.Fatalf("failed to setup queues: %v", err)
	}

	receivedMessages := make(chan types.QueueMessage, 1)
	monitor, err := worker.NewPoisonQueueMonitor(rabbitmqURL, func(msg types.QueueMessage, reason string) {
		receivedMessages <- msg
	})
	if err != nil {
		t.Fatalf("failed to create monitor: %v", err)
	}
	defer monitor.Close()

	time.Sleep(500 * time.Millisecond)

	publisher, err := queue.NewPublisher(rabbitmqURL)
	if err != nil {
		t.Fatalf("failed to create publisher: %v", err)
	}
	defer publisher.Close()

	testMsg := types.QueueMessage{
		DeliveryID:    uuid.New().String(),
		EventID:       uuid.New().String(),
		EndpointID:    uuid.New().String(),
		URL:           "https://example.com/webhook",
		EventType:     "test.event",
		Payload:       types.JSONB{"test": "data"},
		AttemptNumber: 5,
		MaxRetries:    5,
	}

	ctx := context.Background()
	if err := publisher.PublishWebhookToDLX(ctx, &testMsg); err != nil {
		t.Fatalf("failed to publish to DLX: %v", err)
	}

	select {
	case received := <-receivedMessages:
		if received.DeliveryID != testMsg.DeliveryID {
			t.Errorf("expected delivery ID %s, got %s", testMsg.DeliveryID, received.DeliveryID)
		}
		if received.EventType != testMsg.EventType {
			t.Errorf("expected event type %s, got %s", testMsg.EventType, received.EventType)
		}
	case <-time.After(5 * time.Second):
		t.Fatal("timeout waiting for poison queue message")
	}

	count := monitor.GetFailedMessageCount()
	if count != 1 {
		t.Errorf("expected failed message count 1, got %d", count)
	}
}
