package queue

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/usevon/von/pkg/types"
	rabbitmq "github.com/wagslane/go-rabbitmq"
)

type Consumer struct {
	conn     *rabbitmq.Conn
	consumer *rabbitmq.Consumer
}

type MessageHandler func(ctx context.Context, msg types.QueueMessage) error

// NewConsumer creates a consumer that processes webhook delivery messages from RabbitMQ.
// The handler is called for each message and should return an error to trigger a retry.
func NewConsumer(url string, handler MessageHandler) (*Consumer, error) {
	return NewConsumerWithConfig(DefaultConfig(url), handler)
}

// NewConsumerWithConfig creates a consumer with custom configuration.
func NewConsumerWithConfig(config Config, handler MessageHandler) (*Consumer, error) {
	conn, err := rabbitmq.NewConn(config.RabbitMQURL)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to RabbitMQ at %s: %w", config.RabbitMQURL, err)
	}

	consumer, err := rabbitmq.NewConsumer(
		conn,
		WebhookQueue,
		rabbitmq.WithConsumerOptionsQueueDurable,
		rabbitmq.WithConsumerOptionsExchangeName(WebhookExchange),
		rabbitmq.WithConsumerOptionsExchangeKind("topic"),
		rabbitmq.WithConsumerOptionsExchangeDurable,
		rabbitmq.WithConsumerOptionsExchangeDeclare,
		rabbitmq.WithConsumerOptionsRoutingKey(WebhookRoutingKey),
		rabbitmq.WithConsumerOptionsConcurrency(config.Concurrency),
		rabbitmq.WithConsumerOptionsConsumerName(config.ConsumerName),
	)
	if err != nil {
		conn.Close()
		return nil, fmt.Errorf("failed to create consumer: %w", err)
	}

	go func() {
		err := consumer.Run(func(d rabbitmq.Delivery) rabbitmq.Action {
			var msg types.QueueMessage
			if err := json.Unmarshal(d.Body, &msg); err != nil {
				log.Printf("failed to unmarshal message (will send to DLQ): %v, body: %s", err, string(d.Body))
				// Send malformed messages to DLQ for debugging instead of silently discarding
				return rabbitmq.NackDiscard
			}

			// Create context with timeout for handler execution
			ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
			defer cancel()

			if err := handler(ctx, msg); err != nil {
				log.Printf("handler failed for delivery %s (attempt %d/%d): %v",
					msg.DeliveryID, msg.AttemptNumber, msg.MaxRetries, err)

				// Requeue if we haven't exceeded max retries
				if msg.AttemptNumber < msg.MaxRetries {
					return rabbitmq.NackRequeue
				}

				// Max retries exceeded - send to DLQ
				log.Printf("max retries exceeded for delivery %s, sending to DLQ", msg.DeliveryID)
				return rabbitmq.NackDiscard
			}

			return rabbitmq.Ack
		})
		if err != nil {
			log.Printf("consumer error (will attempt reconnect): %v", err)
			// TODO: Add exponential backoff reconnection logic
		}
	}()

	return &Consumer{
		conn:     conn,
		consumer: consumer,
	}, nil
}

func (c *Consumer) Close() {
	c.consumer.Close()
	c.conn.Close()
}
