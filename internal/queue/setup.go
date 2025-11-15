package queue

import (
	"fmt"

	amqp "github.com/rabbitmq/amqp091-go"
)

// EnsureQueues creates all necessary RabbitMQ exchanges, queues, and bindings.
// This should be called on startup before publishing or consuming messages.
func EnsureQueues(url string) error {
	conn, err := amqp.Dial(url)
	if err != nil {
		return fmt.Errorf("failed to connect to RabbitMQ: %w", err)
	}
	defer conn.Close()

	ch, err := conn.Channel()
	if err != nil {
		return fmt.Errorf("failed to open channel: %w", err)
	}
	defer ch.Close()

	if err := ch.ExchangeDeclare(WebhookExchange, "topic", true, false, false, false, nil); err != nil {
		return fmt.Errorf("failed to declare webhook exchange: %w", err)
	}

	if err := ch.ExchangeDeclare(WebhookDLXExchange, "fanout", true, false, false, false, nil); err != nil {
		return fmt.Errorf("failed to declare DLX exchange: %w", err)
	}

	if _, err := ch.QueueDeclare(
		WebhookQueue,
		true,
		false,
		false,
		false,
		amqp.Table{
			"x-queue-type":           "quorum",
			"x-dead-letter-exchange": WebhookDLXExchange,
			"x-delivery-limit":       5,
		},
	); err != nil {
		return fmt.Errorf("failed to declare webhook queue: %w", err)
	}

	if err := ch.QueueBind(WebhookQueue, WebhookRoutingKey, WebhookExchange, false, nil); err != nil {
		return fmt.Errorf("failed to bind webhook queue: %w", err)
	}

	if _, err := ch.QueueDeclare(
		WebhookDLXQueue,
		true,
		false,
		false,
		false,
		amqp.Table{"x-queue-type": "quorum"},
	); err != nil {
		return fmt.Errorf("failed to declare DLX queue: %w", err)
	}

	if err := ch.QueueBind(WebhookDLXQueue, "", WebhookDLXExchange, false, nil); err != nil {
		return fmt.Errorf("failed to bind DLX queue: %w", err)
	}

	return nil
}
