package queue

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/usevon/von/pkg/types"
)

// Queue interface for webhook job queuing
type Queue interface {
	Publish(ctx context.Context, job types.SendWebhookRequest) error
	Consume(ctx context.Context, handler func(types.SendWebhookRequest) error) error
	Close() error
}

// RabbitMQClient implements Queue interface using RabbitMQ
type RabbitMQClient struct {
	url string
	// TODO: Add actual RabbitMQ connection
}

func NewRabbitMQ(url string) (*RabbitMQClient, error) {
	// TODO: Connect to RabbitMQ
	return &RabbitMQClient{url: url}, nil
}

func (c *RabbitMQClient) Publish(ctx context.Context, job types.SendWebhookRequest) error {
	// TODO: Publish message to queue
	payload, err := json.Marshal(job)
	if err != nil {
		return fmt.Errorf("failed to marshal job: %w", err)
	}
	_ = payload
	return nil
}

func (c *RabbitMQClient) Consume(ctx context.Context, handler func(types.SendWebhookRequest) error) error {
	// TODO: Consume messages from queue and call handler
	return nil
}

func (c *RabbitMQClient) Close() error {
	// TODO: Close connection
	return nil
}
