package queue

import (
	"context"
	"encoding/json"
	"fmt"
	"log"

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
	conn, err := rabbitmq.NewConn(url)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to RabbitMQ: %w", err)
	}

	consumer, err := rabbitmq.NewConsumer(
		conn,
		WebhookQueue,
		rabbitmq.WithConsumerOptionsRoutingKey(WebhookRoutingKey),
		rabbitmq.WithConsumerOptionsExchangeName(WebhookExchange),
		rabbitmq.WithConsumerOptionsQueueDurable,
		rabbitmq.WithConsumerOptionsQueueArgs(rabbitmq.Table{
			"x-queue-type":           "quorum",
			"x-dead-letter-exchange": WebhookDLXExchange,
			"x-delivery-limit":       5,
		}),
		rabbitmq.WithConsumerOptionsConcurrency(10),
		rabbitmq.WithConsumerOptionsConsumerName("von-worker"),
	)
	if err != nil {
		conn.Close()
		return nil, fmt.Errorf("failed to create consumer: %w", err)
	}

	err = consumer.Run(func(d rabbitmq.Delivery) rabbitmq.Action {
		var msg types.QueueMessage
		if err := json.Unmarshal(d.Body, &msg); err != nil {
			log.Printf("Failed to unmarshal message: %v", err)
			return rabbitmq.NackDiscard
		}

		ctx := context.Background()
		if err := handler(ctx, msg); err != nil {
			log.Printf("Handler failed for delivery %s: %v", msg.DeliveryID, err)

			if msg.AttemptNumber < msg.MaxRetries {
				return rabbitmq.NackRequeue
			}
			return rabbitmq.NackDiscard
		}

		return rabbitmq.Ack
	})
	if err != nil {
		conn.Close()
		return nil, fmt.Errorf("failed to start consumer: %w", err)
	}

	return &Consumer{
		conn:     conn,
		consumer: consumer,
	}, nil
}

func (c *Consumer) Close() {
	c.consumer.Close()
	c.conn.Close()
}
