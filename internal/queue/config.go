package queue

import "time"

// Config holds configuration for the webhook queue.
type Config struct {
	// RabbitMQURL is the connection string for RabbitMQ
	RabbitMQURL string

	// Concurrency is the number of concurrent workers processing messages
	Concurrency int

	// ConsumerName is the name of this consumer instance
	ConsumerName string

	// ReconnectInterval is the delay between reconnection attempts
	ReconnectInterval time.Duration
}

// DefaultConfig returns sensible default configuration.
func DefaultConfig(rabbitmqURL string) Config {
	return Config{
		RabbitMQURL:       rabbitmqURL,
		Concurrency:       10,
		ConsumerName:      "von-worker",
		ReconnectInterval: 10 * time.Second,
	}
}
