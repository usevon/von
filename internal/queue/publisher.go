package queue

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/usevon/von/pkg/types"
	rabbitmq "github.com/wagslane/go-rabbitmq"
)

const (
	WebhookExchange    = "von.webhooks"
	WebhookQueue       = "von.webhooks.delivery"
	WebhookDLXExchange = "von.webhooks.dlx"
	WebhookDLXQueue    = "von.webhooks.failed"
	WebhookRoutingKey  = "delivery"
)

// Publisher publishes webhook delivery messages to RabbitMQ.
type Publisher struct {
	conn      *rabbitmq.Conn
	publisher *rabbitmq.Publisher
}

// NewPublisher creates a new Publisher connected to RabbitMQ.
func NewPublisher(url string) (*Publisher, error) {
	conn, err := rabbitmq.NewConn(url)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to RabbitMQ: %w", err)
	}

	publisher, err := rabbitmq.NewPublisher(
		conn,
		rabbitmq.WithPublisherOptionsExchangeName(WebhookExchange),
		rabbitmq.WithPublisherOptionsExchangeKind("topic"),
		rabbitmq.WithPublisherOptionsExchangeDurable,
		rabbitmq.WithPublisherOptionsExchangeDeclare,
	)
	if err != nil {
		conn.Close()
		return nil, fmt.Errorf("failed to create publisher: %w", err)
	}

	return &Publisher{
		conn:      conn,
		publisher: publisher,
	}, nil
}

// PublishWebhook publishes a webhook delivery message to the queue.
func (p *Publisher) PublishWebhook(ctx context.Context, msg types.QueueMessage) error {
	payload, err := json.Marshal(msg)
	if err != nil {
		return fmt.Errorf("failed to marshal message: %w", err)
	}

	err = p.publisher.PublishWithContext(
		ctx,
		payload,
		[]string{WebhookRoutingKey},
		rabbitmq.WithPublishOptionsContentType("application/json"),
		rabbitmq.WithPublishOptionsMandatory,
		rabbitmq.WithPublishOptionsPersistentDelivery,
		rabbitmq.WithPublishOptionsExchange(WebhookExchange),
	)
	if err != nil {
		return fmt.Errorf("failed to publish message: %w", err)
	}

	return nil
}

// Close closes the publisher and its connection.
func (p *Publisher) Close() {
	p.publisher.Close()
	p.conn.Close()
}
