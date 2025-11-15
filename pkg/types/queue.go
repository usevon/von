package types

import "time"

type QueueMessage struct {
	DeliveryID    string                 `json:"delivery_id"`
	EventID       string                 `json:"event_id"`
	EndpointID    string                 `json:"endpoint_id"`
	URL           string                 `json:"url"`
	EventType     string                 `json:"event_type"`
	Payload       map[string]interface{} `json:"payload"`
	Headers       map[string]string      `json:"headers"`
	Secret        string                 `json:"secret"`
	AttemptNumber int                    `json:"attempt_number"`
	DeliveryMode  DeliveryMode           `json:"delivery_mode"`
	MaxRetries    int                    `json:"max_retries"`
	RetryStrategy RetryStrategy          `json:"retry_strategy"`
	EnqueuedAt    time.Time              `json:"enqueued_at"`
}
