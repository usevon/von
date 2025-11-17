package queue

import (
	"fmt"

	rabbitmq "github.com/wagslane/go-rabbitmq"
)

// EnsureQueues ensures all required RabbitMQ exchanges and queues exist.
// This should be called during application startup or test setup to verify
// that the messaging infrastructure is properly configured.
func EnsureQueues(rabbitmqURL string) error {
	return EnsureQueuesWithConfig(DefaultConfig(rabbitmqURL))
}

// EnsureQueuesWithConfig ensures queues exist using custom configuration.
func EnsureQueuesWithConfig(config Config) error {
	// Create a temporary connection to declare infrastructure
	conn, err := rabbitmq.NewConn(
		config.RabbitMQURL,
		rabbitmq.WithConnectionOptionsReconnectInterval(config.ReconnectInterval),
	)
	if err != nil {
		return fmt.Errorf("failed to connect to RabbitMQ: %w", err)
	}
	defer conn.Close()

	// Declare the main webhook exchange and queue by creating a temporary consumer
	// This ensures the exchange, queue, and bindings are created
	consumer, err := rabbitmq.NewConsumer(
		conn,
		WebhookQueue,
		rabbitmq.WithConsumerOptionsQueueDurable,
		rabbitmq.WithConsumerOptionsExchangeName(WebhookExchange),
		rabbitmq.WithConsumerOptionsExchangeKind("topic"),
		rabbitmq.WithConsumerOptionsExchangeDurable,
		rabbitmq.WithConsumerOptionsExchangeDeclare,
		rabbitmq.WithConsumerOptionsRoutingKey(WebhookRoutingKey),
	)
	if err != nil {
		return fmt.Errorf("failed to declare webhook queue: %w", err)
	}
	consumer.Close()

	// Declare DLX exchange and queue
	dlxConsumer, err := rabbitmq.NewConsumer(
		conn,
		WebhookDLXQueue,
		rabbitmq.WithConsumerOptionsQueueDurable,
		rabbitmq.WithConsumerOptionsExchangeName(WebhookDLXExchange),
		rabbitmq.WithConsumerOptionsExchangeKind("topic"),
		rabbitmq.WithConsumerOptionsExchangeDurable,
		rabbitmq.WithConsumerOptionsExchangeDeclare,
		rabbitmq.WithConsumerOptionsRoutingKey("#"),
	)
	if err != nil {
		return fmt.Errorf("failed to declare DLX queue: %w", err)
	}
	dlxConsumer.Close()

	// Declare usage events exchange and queue
	usageConsumer, err := rabbitmq.NewConsumer(
		conn,
		UsageQueue,
		rabbitmq.WithConsumerOptionsQueueDurable,
		rabbitmq.WithConsumerOptionsExchangeName(UsageExchange),
		rabbitmq.WithConsumerOptionsExchangeKind("topic"),
		rabbitmq.WithConsumerOptionsExchangeDurable,
		rabbitmq.WithConsumerOptionsExchangeDeclare,
		rabbitmq.WithConsumerOptionsRoutingKey(UsageRoutingKey),
	)
	if err != nil {
		return fmt.Errorf("failed to declare usage queue: %w", err)
	}
	usageConsumer.Close()

	return nil
}
