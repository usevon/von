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

// Consumer consumes webhook delivery messages from RabbitMQ.
type Consumer struct {
	conn     *rabbitmq.Conn
	consumer *rabbitmq.Consumer
}

// MessageHandler processes a single webhook delivery message.
// Returning an error triggers a retry if attempts remain.
type MessageHandler func(ctx context.Context, msg types.QueueMessage) error

// ConsumerOptions configures a consumer for either main queue or DLX.
type ConsumerOptions struct {
	Queue        string
	Exchange     string
	RoutingKey   string
	ConsumerName string
	IsDLX        bool
	Timeout      time.Duration
}

// NewConsumer returns a new consumer that processes webhook delivery messages from RabbitMQ.
func NewConsumer(url string, handler MessageHandler) (*Consumer, error) {
	return newConsumer(DefaultConfig(url), handler, ConsumerOptions{
		Queue:        WebhookQueue,
		Exchange:     WebhookExchange,
		RoutingKey:   WebhookRoutingKey,
		ConsumerName: DefaultConfig(url).ConsumerName,
		IsDLX:        false,
		Timeout:      2 * time.Minute,
	})
}

// NewConsumerWithConfig creates a consumer with custom configuration.
func NewConsumerWithConfig(config Config, handler MessageHandler) (*Consumer, error) {
	return newConsumer(config, handler, ConsumerOptions{
		Queue:        WebhookQueue,
		Exchange:     WebhookExchange,
		RoutingKey:   WebhookRoutingKey,
		ConsumerName: config.ConsumerName,
		IsDLX:        false,
		Timeout:      2 * time.Minute,
	})
}

// NewDLXConsumer creates a consumer for the dead letter exchange queue.
func NewDLXConsumer(url string, handler MessageHandler) (*Consumer, error) {
	return newConsumer(DefaultConfig(url), handler, ConsumerOptions{
		Queue:        WebhookDLXQueue,
		Exchange:     WebhookDLXExchange,
		RoutingKey:   "#",
		ConsumerName: "von-dlx-monitor",
		IsDLX:        true,
		Timeout:      30 * time.Second,
	})
}

// newConsumer creates a unified consumer for both main and DLX queues.
func newConsumer(config Config, handler MessageHandler, opts ConsumerOptions) (*Consumer, error) {
	conn, err := rabbitmq.NewConn(config.RabbitMQURL, rabbitmq.WithConnectionOptionsReconnectInterval(config.ReconnectInterval))
	if err != nil {
		return nil, fmt.Errorf("failed to connect to RabbitMQ at %s: %w", config.RabbitMQURL, err)
	}

	consumerOpts := []func(*rabbitmq.ConsumerOptions){
		rabbitmq.WithConsumerOptionsQueueDurable,
		rabbitmq.WithConsumerOptionsExchangeName(opts.Exchange),
		rabbitmq.WithConsumerOptionsExchangeKind("topic"),
		rabbitmq.WithConsumerOptionsExchangeDurable,
		rabbitmq.WithConsumerOptionsRoutingKey(opts.RoutingKey),
		rabbitmq.WithConsumerOptionsConcurrency(config.Concurrency),
		rabbitmq.WithConsumerOptionsConsumerName(opts.ConsumerName),
	}
	if !opts.IsDLX {
		consumerOpts = append(consumerOpts, rabbitmq.WithConsumerOptionsExchangeDeclare)
	}

	consumer, err := rabbitmq.NewConsumer(conn, opts.Queue, consumerOpts...)
	if err != nil {
		conn.Close()
		return nil, fmt.Errorf("failed to create consumer: %w", err)
	}

	logPrefix := ""
	if opts.IsDLX {
		logPrefix = "[DLX] "
	}

	go func() {
		err := consumer.Run(func(d rabbitmq.Delivery) rabbitmq.Action {
			var msg types.QueueMessage
			if err := json.Unmarshal(d.Body, &msg); err != nil {
				log.Printf("%sfailed to unmarshal message: %v, body: %s", logPrefix, err, string(d.Body))
				return rabbitmq.Ack
			}

			ctx, cancel := context.WithTimeout(context.Background(), opts.Timeout)
			defer cancel()

			if err := handler(ctx, msg); err != nil {
				log.Printf("%shandler failed for delivery %s: %v", logPrefix, msg.DeliveryID, err)
				if !opts.IsDLX && msg.AttemptNumber < msg.MaxRetries {
					return rabbitmq.NackRequeue
				}
				if !opts.IsDLX {
					log.Printf("max retries exceeded for delivery %s, sending to DLQ", msg.DeliveryID)
					return rabbitmq.NackDiscard
				}
			}

			return rabbitmq.Ack
		})
		if err != nil {
			log.Printf("%sconsumer run error: %v", logPrefix, err)
		}
	}()

	return &Consumer{conn: conn, consumer: consumer}, nil
}

// Close closes the consumer and its connection.
func (c *Consumer) Close() {
	c.consumer.Close()
	c.conn.Close()
}
