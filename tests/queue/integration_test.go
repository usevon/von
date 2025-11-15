package queue_test

import (
	"context"
	"testing"
	"time"

	"github.com/usevon/von/internal/queue"
	"github.com/usevon/von/pkg/types"
	rabbitmq "github.com/rabbitmq/amqp091-go"
)

const testRabbitMQURL = "amqp://von:von_dev_password@localhost:5672/"

func TestQueueSetup(t *testing.T) {
	err := queue.EnsureQueues(testRabbitMQURL)
	if err != nil {
		t.Fatalf("failed to ensure queues: %v", err)
	}

	conn, err := rabbitmq.Dial(testRabbitMQURL)
	if err != nil {
		t.Fatalf("failed to dial rabbitmq: %v", err)
	}
	defer conn.Close()

	ch, err := conn.Channel()
	if err != nil {
		t.Fatalf("failed to open channel: %v", err)
	}
	defer ch.Close()

	_, err = ch.QueueInspect(queue.WebhookQueue)
	if err != nil {
		t.Errorf("webhook queue not found: %v", err)
	}

	_, err = ch.QueueInspect(queue.WebhookDLXQueue)
	if err != nil {
		t.Errorf("DLX queue not found: %v", err)
	}
}

func TestPublishAndConsume(t *testing.T) {
	err := queue.EnsureQueues(testRabbitMQURL)
	if err != nil {
		t.Fatalf("failed to ensure queues: %v", err)
	}

	publisher, err := queue.NewPublisher(testRabbitMQURL)
	if err != nil {
		t.Fatalf("failed to create publisher: %v", err)
	}
	defer publisher.Close()

	received := make(chan types.QueueMessage, 1)
	handler := func(ctx context.Context, msg types.QueueMessage) error {
		received <- msg
		return nil
	}

	consumer, err := queue.NewConsumer(testRabbitMQURL, handler)
	if err != nil {
		t.Fatalf("failed to create consumer: %v", err)
	}
	defer consumer.Close()

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

	err = publisher.PublishWebhook(ctx, testMsg)
	if err != nil {
		t.Fatalf("failed to publish webhook: %v", err)
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
	err := queue.EnsureQueues(testRabbitMQURL)
	if err != nil {
		t.Fatalf("failed to ensure queues: %v", err)
	}

	publisher, err := queue.NewPublisher(testRabbitMQURL)
	if err != nil {
		t.Fatalf("failed to create publisher: %v", err)
	}
	defer publisher.Close()

	messageCount := 10
	received := make(chan types.QueueMessage, messageCount)
	handler := func(ctx context.Context, msg types.QueueMessage) error {
		received <- msg
		return nil
	}

	consumer, err := queue.NewConsumer(testRabbitMQURL, handler)
	if err != nil {
		t.Fatalf("failed to create consumer: %v", err)
	}
	defer consumer.Close()

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
		err := publisher.PublishWebhook(ctx, msg)
		if err != nil {
			t.Fatalf("failed to publish webhook: %v", err)
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
	err := queue.EnsureQueues(testRabbitMQURL)
	if err != nil {
		t.Fatalf("failed to ensure queues: %v", err)
	}

	publisher, err := queue.NewPublisher(testRabbitMQURL)
	if err != nil {
		t.Fatalf("failed to create publisher: %v", err)
	}
	defer publisher.Close()

	attempts := 0
	handler := func(ctx context.Context, msg types.QueueMessage) error {
		attempts++
		if attempts < 3 {
			return &testError{msg: "simulated failure"}
		}
		return nil
	}

	consumer, err := queue.NewConsumer(testRabbitMQURL, handler)
	if err != nil {
		t.Fatalf("failed to create consumer: %v", err)
	}
	defer consumer.Close()

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

	err = publisher.PublishWebhook(ctx, testMsg)
	if err != nil {
		t.Fatalf("failed to publish webhook: %v", err)
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
