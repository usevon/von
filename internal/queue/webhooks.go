package queue

import (
	"context"
	"fmt"

	"github.com/usevon/von/pkg/types"
)

// Queue provides a simple interface for webhook delivery operations.
type Queue struct {
	config    Config
	publisher *Publisher
	consumer  *Consumer
}

// NewQueue creates a new webhook queue for enqueuing and processing deliveries.
func NewQueue(rabbitmqURL string) (*Queue, error) {
	return NewQueueWithConfig(DefaultConfig(rabbitmqURL))
}

// NewQueueWithConfig creates a new webhook queue with custom configuration.
func NewQueueWithConfig(config Config) (*Queue, error) {
	publisher, err := NewPublisher(config.RabbitMQURL)
	if err != nil {
		return nil, err
	}

	return &Queue{
		config:    config,
		publisher: publisher,
	}, nil
}

// Publisher returns the underlying publisher for reuse (e.g., in Worker).
func (q *Queue) Publisher() *Publisher {
	return q.publisher
}

// Enqueue adds a webhook delivery to the queue for async processing.
func (q *Queue) Enqueue(ctx context.Context, delivery *types.QueueMessage) error {
	return q.publisher.PublishWebhook(ctx, delivery)
}

// EnqueueBatch adds multiple webhook deliveries to the queue in a single operation.
// This is more efficient than calling Enqueue multiple times.
func (q *Queue) EnqueueBatch(ctx context.Context, deliveries []*types.QueueMessage) error {
	for i, delivery := range deliveries {
		if err := q.publisher.PublishWebhook(ctx, delivery); err != nil {
			return fmt.Errorf("failed to enqueue message %d/%d: %w", i+1, len(deliveries), err)
		}
	}
	return nil
}

// StartWorker starts processing webhook deliveries from the queue.
// The handler is called for each delivery and should return an error to trigger a retry.
func (q *Queue) StartWorker(handler MessageHandler) error {
	consumer, err := NewConsumerWithConfig(q.config, handler)
	if err != nil {
		return err
	}
	q.consumer = consumer
	return nil
}

// Close closes the webhook queue and releases resources.
func (q *Queue) Close() {
	if q.publisher != nil {
		q.publisher.Close()
	}
	if q.consumer != nil {
		q.consumer.Close()
	}
}
