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
	UsageExchange      = "von.usage"
	UsageQueue         = "von.usage.events"
	UsageRoutingKey    = "event"
)

// Publisher publishes webhook delivery messages to RabbitMQ.
type Publisher struct {
	conn      *rabbitmq.Conn
	publisher *rabbitmq.Publisher
}

// NewPublisher returns a new publisher connected to RabbitMQ.
func NewPublisher(url string) (*Publisher, error) {
	return NewPublisherWithConfig(DefaultConfig(url))
}

// NewPublisherWithConfig returns a new publisher with custom configuration.
func NewPublisherWithConfig(config Config) (*Publisher, error) {
	conn, err := rabbitmq.NewConn(
		config.RabbitMQURL,
		rabbitmq.WithConnectionOptionsReconnectInterval(config.ReconnectInterval),
	)
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
func (p *Publisher) PublishWebhook(ctx context.Context, msg *types.QueueMessage) error {
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

// PublishBatch publishes multiple webhook delivery messages in a batch.
func (p *Publisher) PublishBatch(ctx context.Context, messages []*types.QueueMessage) error {
	for _, msg := range messages {
		if err := p.PublishWebhook(ctx, msg); err != nil {
			return err
		}
	}
	return nil
}

// PublishUsageEvent publishes a usage tracking event to the queue.
func (p *Publisher) PublishUsageEvent(ctx context.Context, event *types.UsageEvent) error {
	payload, err := json.Marshal(event)
	if err != nil {
		return fmt.Errorf("failed to marshal usage event: %w", err)
	}

	err = p.publisher.PublishWithContext(
		ctx,
		payload,
		[]string{UsageRoutingKey},
		rabbitmq.WithPublishOptionsContentType("application/json"),
		rabbitmq.WithPublishOptionsMandatory,
		rabbitmq.WithPublishOptionsPersistentDelivery,
		rabbitmq.WithPublishOptionsExchange(UsageExchange),
	)
	if err != nil {
		return fmt.Errorf("failed to publish usage event: %w", err)
	}

	return nil
}

// PublishWebhookToDLX publishes a message directly to the dead letter exchange (for testing).
func (p *Publisher) PublishWebhookToDLX(ctx context.Context, msg *types.QueueMessage) error {
	payload, err := json.Marshal(msg)
	if err != nil {
		return fmt.Errorf("failed to marshal message: %w", err)
	}

	err = p.publisher.PublishWithContext(
		ctx,
		payload,
		[]string{"#"},
		rabbitmq.WithPublishOptionsContentType("application/json"),
		rabbitmq.WithPublishOptionsMandatory,
		rabbitmq.WithPublishOptionsPersistentDelivery,
		rabbitmq.WithPublishOptionsExchange(WebhookDLXExchange),
	)
	if err != nil {
		return fmt.Errorf("failed to publish message to DLX: %w", err)
	}

	return nil
}

// Close closes the publisher and its connection.
func (p *Publisher) Close() {
	p.publisher.Close()
	p.conn.Close()
}
