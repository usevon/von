package queue

import (
	"context"

	"github.com/usevon/von/pkg/types"
)

// Queue provides a simple interface for webhook delivery operations.
type Queue struct {
	rabbitmqURL string
	publisher   *Publisher
	consumer    *Consumer
}

// NewQueue creates a new webhook queue for enqueuing and processing deliveries.
func NewQueue(rabbitmqURL string) (*Queue, error) {
	publisher, err := NewPublisher(rabbitmqURL)
	if err != nil {
		return nil, err
	}

	return &Queue{
		rabbitmqURL: rabbitmqURL,
		publisher:   publisher,
	}, nil
}

// Enqueue adds a webhook delivery to the queue for async processing.
func (q *Queue) Enqueue(ctx context.Context, delivery types.QueueMessage) error {
	return q.publisher.PublishWebhook(ctx, delivery)
}

// StartWorker starts processing webhook deliveries from the queue.
// The handler is called for each delivery and should return an error to trigger a retry.
func (q *Queue) StartWorker(handler MessageHandler) error {
	consumer, err := NewConsumer(q.rabbitmqURL, handler)
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
