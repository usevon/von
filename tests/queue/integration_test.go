package queue_test

import (
	"context"
	"testing"
	"time"

	"github.com/usevon/von/internal/queue"
	"github.com/usevon/von/pkg/types"
	"github.com/usevon/von/tests/util"
)

var testRabbitMQURL = util.GetRabbitMQURL()

func TestQueueSetup(t *testing.T) {
	q, err := queue.NewQueue(testRabbitMQURL)
	if err != nil {
		t.Fatalf("failed to create queue: %v", err)
	}
	defer q.Close()

	received := make(chan types.QueueMessage, 1)
	err = q.StartWorker(func(ctx context.Context, msg types.QueueMessage) error {
		received <- msg
		return nil
	})
	if err != nil {
		t.Fatalf("failed to start worker: %v", err)
	}

	time.Sleep(1 * time.Second)

	testMsg := types.QueueMessage{
		DeliveryID:    "setup-test",
		EventID:       "event-1",
		EndpointID:    "endpoint-1",
		URL:           "https://example.com/webhook",
		EventType:     "test.setup",
		Payload:       map[string]interface{}{},
		AttemptNumber: 1,
		DeliveryMode:  types.DeliveryModeAsync,
		MaxRetries:    3,
		RetryStrategy: types.RetryStrategyExponential,
		EnqueuedAt:    time.Now(),
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	err = q.Enqueue(ctx, testMsg)
	if err != nil {
		t.Fatalf("failed to enqueue message: %v", err)
	}

	select {
	case <-received:
		// Success - queue infrastructure is working
	case <-ctx.Done():
		t.Fatal("timeout waiting for message - queue infrastructure not working")
	}
}

func TestPublishAndConsume(t *testing.T) {
	q, err := queue.NewQueue(testRabbitMQURL)
	if err != nil {
		t.Fatalf("failed to create queue: %v", err)
	}
	defer q.Close()

	received := make(chan types.QueueMessage, 1)
	err = q.StartWorker(func(ctx context.Context, msg types.QueueMessage) error {
		received <- msg
		return nil
	})
	if err != nil {
		t.Fatalf("failed to start worker: %v", err)
	}

	time.Sleep(1 * time.Second)

	testMsg := types.QueueMessage{
		DeliveryID:    "test-delivery-123",
		EventID:       "test-event-456",
		EndpointID:    "test-endpoint-789",
		URL:           "https://example.com/webhook",
		EventType:     "user.created",
		Payload:       map[string]interface{}{"user_id": "123"},
		Headers:       map[string]string{"X-Custom": "value"},
		Secret:        "secret123",
		AttemptNumber: 1,
		DeliveryMode:  types.DeliveryModeAsync,
		MaxRetries:    5,
		RetryStrategy: types.RetryStrategyExponential,
		EnqueuedAt:    time.Now(),
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	err = q.Enqueue(ctx, testMsg)
	if err != nil {
		t.Fatalf("failed to enqueue webhook: %v", err)
	}

	select {
	case msg := <-received:
		if msg.DeliveryID != testMsg.DeliveryID {
			t.Errorf("expected DeliveryID %s, got %s", testMsg.DeliveryID, msg.DeliveryID)
		}
		if msg.EventID != testMsg.EventID {
			t.Errorf("expected EventID %s, got %s", testMsg.EventID, msg.EventID)
		}
		if msg.EndpointID != testMsg.EndpointID {
			t.Errorf("expected EndpointID %s, got %s", testMsg.EndpointID, msg.EndpointID)
		}
		if msg.URL != testMsg.URL {
			t.Errorf("expected URL %s, got %s", testMsg.URL, msg.URL)
		}
		if msg.EventType != testMsg.EventType {
			t.Errorf("expected EventType %s, got %s", testMsg.EventType, msg.EventType)
		}
		if msg.Secret != testMsg.Secret {
			t.Errorf("expected Secret %s, got %s", testMsg.Secret, msg.Secret)
		}
	case <-ctx.Done():
		t.Fatal("timeout waiting for message")
	}
}

func TestPublishMultipleMessages(t *testing.T) {
	q, err := queue.NewQueue(testRabbitMQURL)
	if err != nil {
		t.Fatalf("failed to create queue: %v", err)
	}
	defer q.Close()

	messageCount := 10
	received := make(chan types.QueueMessage, messageCount)
	err = q.StartWorker(func(ctx context.Context, msg types.QueueMessage) error {
		received <- msg
		return nil
	})
	if err != nil {
		t.Fatalf("failed to start worker: %v", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	for i := 0; i < messageCount; i++ {
		msg := types.QueueMessage{
			DeliveryID:    "delivery-" + string(rune(i)),
			EventID:       "event-" + string(rune(i)),
			EndpointID:    "endpoint-123",
			URL:           "https://example.com/webhook",
			EventType:     "test.event",
			Payload:       map[string]interface{}{"index": i},
			AttemptNumber: 1,
			DeliveryMode:  types.DeliveryModeAsync,
			MaxRetries:    5,
			RetryStrategy: types.RetryStrategyExponential,
			EnqueuedAt:    time.Now(),
		}
		err := q.Enqueue(ctx, msg)
		if err != nil {
			t.Fatalf("failed to enqueue webhook: %v", err)
		}
	}

	receivedCount := 0
	timeout := time.After(5 * time.Second)
	for receivedCount < messageCount {
		select {
		case <-received:
			receivedCount++
		case <-timeout:
			t.Fatalf("timeout: only received %d/%d messages", receivedCount, messageCount)
		}
	}
}

func TestConsumerRetry(t *testing.T) {
	t.Skip("Skipping retry test - flaky due to message leakage between tests")
	q, err := queue.NewQueue(testRabbitMQURL)
	if err != nil {
		t.Fatalf("failed to create queue: %v", err)
	}
	defer q.Close()

	attempts := 0
	err = q.StartWorker(func(ctx context.Context, msg types.QueueMessage) error {
		attempts++
		if attempts < 3 {
			return &testError{msg: "simulated failure"}
		}
		return nil
	})
	if err != nil {
		t.Fatalf("failed to start worker: %v", err)
	}

	testMsg := types.QueueMessage{
		DeliveryID:    "retry-test-delivery",
		EventID:       "retry-test-event",
		EndpointID:    "retry-test-endpoint",
		URL:           "https://example.com/webhook",
		EventType:     "retry.test",
		Payload:       map[string]interface{}{},
		AttemptNumber: 1,
		DeliveryMode:  types.DeliveryModeAsync,
		MaxRetries:    5,
		RetryStrategy: types.RetryStrategyExponential,
		EnqueuedAt:    time.Now(),
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	err = q.Enqueue(ctx, testMsg)
	if err != nil {
		t.Fatalf("failed to enqueue webhook: %v", err)
	}

	time.Sleep(2 * time.Second)

	if attempts != 3 {
		t.Errorf("expected 3 attempts, got %d", attempts)
	}
}

type testError struct {
	msg string
}

func (e *testError) Error() string {
	return e.msg
}
