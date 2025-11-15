package queue_test

import (
	"context"
	"io"
	"log"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/usevon/von/internal/queue"
	"github.com/usevon/von/pkg/types"
)

func generatePayload(sizeKB int) map[string]interface{} {
	payload := make(map[string]interface{})
	dataSize := sizeKB * 1024
	payload["data"] = strings.Repeat("x", dataSize/2)
	payload["timestamp"] = time.Now().Unix()
	payload["event_id"] = "test-event-123"
	return payload
}

func generateFlatPayload() map[string]interface{} {
	return map[string]interface{}{
		"user_id":    "user_123",
		"event_type": "user.created",
		"timestamp":  time.Now().Unix(),
		"email":      "user@example.com",
		"name":       "Test User",
	}
}

func generateNestedPayload() map[string]interface{} {
	return map[string]interface{}{
		"user": map[string]interface{}{
			"id":    "user_123",
			"email": "user@example.com",
			"profile": map[string]interface{}{
				"name":   "Test User",
				"avatar": "https://example.com/avatar.png",
				"address": map[string]interface{}{
					"street":  "123 Main St",
					"city":    "San Francisco",
					"state":   "CA",
					"zip":     "94105",
					"country": "US",
				},
			},
		},
		"event": map[string]interface{}{
			"type":      "user.created",
			"timestamp": time.Now().Unix(),
			"metadata": map[string]interface{}{
				"ip":         "192.168.1.1",
				"user_agent": "Mozilla/5.0",
				"source":     "web",
			},
		},
	}
}

func BenchmarkPublisher(b *testing.B) {
	log.SetOutput(io.Discard)
	defer log.SetOutput(os.Stderr)

	publisher, err := queue.NewPublisher(testRabbitMQURL)
	if err != nil {
		b.Fatal(err)
	}
	defer publisher.Close()

	msg := types.QueueMessage{
		DeliveryID:    "bench-delivery",
		EventID:       "bench-event",
		EndpointID:    "bench-endpoint",
		URL:           "https://example.com/webhook",
		EventType:     "bench.test",
		Payload:       map[string]interface{}{"data": "test"},
		AttemptNumber: 1,
		DeliveryMode:  types.DeliveryModeAsync,
		MaxRetries:    5,
		RetryStrategy: types.RetryStrategyExponential,
		EnqueuedAt:    time.Now(),
	}

	ctx := context.Background()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		err := publisher.PublishWebhook(ctx, msg)
		if err != nil {
			b.Fatal(err)
		}
	}
}

func BenchmarkPublisherParallel(b *testing.B) {
	log.SetOutput(io.Discard)
	defer log.SetOutput(os.Stderr)

	publisher, err := queue.NewPublisher(testRabbitMQURL)
	if err != nil {
		b.Fatal(err)
	}
	defer publisher.Close()

	msg := types.QueueMessage{
		DeliveryID:    "bench-delivery",
		EventID:       "bench-event",
		EndpointID:    "bench-endpoint",
		URL:           "https://example.com/webhook",
		EventType:     "bench.test",
		Payload:       map[string]interface{}{"data": "test"},
		AttemptNumber: 1,
		DeliveryMode:  types.DeliveryModeAsync,
		MaxRetries:    5,
		RetryStrategy: types.RetryStrategyExponential,
		EnqueuedAt:    time.Now(),
	}

	ctx := context.Background()

	b.ResetTimer()
	b.RunParallel(func(pb *testing.PB) {
		for pb.Next() {
			err := publisher.PublishWebhook(ctx, msg)
			if err != nil {
				b.Fatal(err)
			}
		}
	})
}

func BenchmarkPublisher1KB(b *testing.B) {
	log.SetOutput(io.Discard)
	defer log.SetOutput(os.Stderr)

	publisher, err := queue.NewPublisher(testRabbitMQURL)
	if err != nil {
		b.Fatal(err)
	}
	defer publisher.Close()

	msg := types.QueueMessage{
		DeliveryID:    "bench-delivery",
		EventID:       "bench-event",
		EndpointID:    "bench-endpoint",
		URL:           "https://example.com/webhook",
		EventType:     "bench.test",
		Payload:       generatePayload(1),
		AttemptNumber: 1,
		DeliveryMode:  types.DeliveryModeAsync,
		MaxRetries:    5,
		RetryStrategy: types.RetryStrategyExponential,
		EnqueuedAt:    time.Now(),
	}

	ctx := context.Background()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		err := publisher.PublishWebhook(ctx, msg)
		if err != nil {
			b.Fatal(err)
		}
	}
}

func BenchmarkPublisher10KB(b *testing.B) {
	log.SetOutput(io.Discard)
	defer log.SetOutput(os.Stderr)

	publisher, err := queue.NewPublisher(testRabbitMQURL)
	if err != nil {
		b.Fatal(err)
	}
	defer publisher.Close()

	msg := types.QueueMessage{
		DeliveryID:    "bench-delivery",
		EventID:       "bench-event",
		EndpointID:    "bench-endpoint",
		URL:           "https://example.com/webhook",
		EventType:     "bench.test",
		Payload:       generatePayload(10),
		AttemptNumber: 1,
		DeliveryMode:  types.DeliveryModeAsync,
		MaxRetries:    5,
		RetryStrategy: types.RetryStrategyExponential,
		EnqueuedAt:    time.Now(),
	}

	ctx := context.Background()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		err := publisher.PublishWebhook(ctx, msg)
		if err != nil {
			b.Fatal(err)
		}
	}
}

func BenchmarkPublisher100KB(b *testing.B) {
	log.SetOutput(io.Discard)
	defer log.SetOutput(os.Stderr)

	publisher, err := queue.NewPublisher(testRabbitMQURL)
	if err != nil {
		b.Fatal(err)
	}
	defer publisher.Close()

	msg := types.QueueMessage{
		DeliveryID:    "bench-delivery",
		EventID:       "bench-event",
		EndpointID:    "bench-endpoint",
		URL:           "https://example.com/webhook",
		EventType:     "bench.test",
		Payload:       generatePayload(100),
		AttemptNumber: 1,
		DeliveryMode:  types.DeliveryModeAsync,
		MaxRetries:    5,
		RetryStrategy: types.RetryStrategyExponential,
		EnqueuedAt:    time.Now(),
	}

	ctx := context.Background()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		err := publisher.PublishWebhook(ctx, msg)
		if err != nil {
			b.Fatal(err)
		}
	}
}

func BenchmarkPublisher1MB(b *testing.B) {
	log.SetOutput(io.Discard)
	defer log.SetOutput(os.Stderr)

	publisher, err := queue.NewPublisher(testRabbitMQURL)
	if err != nil {
		b.Fatal(err)
	}
	defer publisher.Close()

	msg := types.QueueMessage{
		DeliveryID:    "bench-delivery",
		EventID:       "bench-event",
		EndpointID:    "bench-endpoint",
		URL:           "https://example.com/webhook",
		EventType:     "bench.test",
		Payload:       generatePayload(1024),
		AttemptNumber: 1,
		DeliveryMode:  types.DeliveryModeAsync,
		MaxRetries:    5,
		RetryStrategy: types.RetryStrategyExponential,
		EnqueuedAt:    time.Now(),
	}

	ctx := context.Background()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		err := publisher.PublishWebhook(ctx, msg)
		if err != nil {
			b.Fatal(err)
		}
	}
}

func BenchmarkPublisherBatch(b *testing.B) {
	log.SetOutput(io.Discard)
	defer log.SetOutput(os.Stderr)

	publisher, err := queue.NewPublisher(testRabbitMQURL)
	if err != nil {
		b.Fatal(err)
	}
	defer publisher.Close()

	batchSize := 100
	messages := make([]types.QueueMessage, batchSize)
	for i := 0; i < batchSize; i++ {
		messages[i] = types.QueueMessage{
			DeliveryID:    "bench-delivery",
			EventID:       "bench-event",
			EndpointID:    "bench-endpoint",
			URL:           "https://example.com/webhook",
			EventType:     "bench.test",
			Payload:       map[string]interface{}{"data": "test"},
			AttemptNumber: 1,
			DeliveryMode:  types.DeliveryModeAsync,
			MaxRetries:    5,
			RetryStrategy: types.RetryStrategyExponential,
			EnqueuedAt:    time.Now(),
		}
	}

	ctx := context.Background()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		err := publisher.PublishBatch(ctx, messages)
		if err != nil {
			b.Fatal(err)
		}
	}
}

func BenchmarkPublisherFlatJSON(b *testing.B) {
	log.SetOutput(io.Discard)
	defer log.SetOutput(os.Stderr)

	publisher, err := queue.NewPublisher(testRabbitMQURL)
	if err != nil {
		b.Fatal(err)
	}
	defer publisher.Close()

	msg := types.QueueMessage{
		DeliveryID:    "bench-delivery",
		EventID:       "bench-event",
		EndpointID:    "bench-endpoint",
		URL:           "https://example.com/webhook",
		EventType:     "bench.test",
		Payload:       generateFlatPayload(),
		AttemptNumber: 1,
		DeliveryMode:  types.DeliveryModeAsync,
		MaxRetries:    5,
		RetryStrategy: types.RetryStrategyExponential,
		EnqueuedAt:    time.Now(),
	}

	ctx := context.Background()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		err := publisher.PublishWebhook(ctx, msg)
		if err != nil {
			b.Fatal(err)
		}
	}
}

func BenchmarkPublisherNestedJSON(b *testing.B) {
	log.SetOutput(io.Discard)
	defer log.SetOutput(os.Stderr)

	publisher, err := queue.NewPublisher(testRabbitMQURL)
	if err != nil {
		b.Fatal(err)
	}
	defer publisher.Close()

	msg := types.QueueMessage{
		DeliveryID:    "bench-delivery",
		EventID:       "bench-event",
		EndpointID:    "bench-endpoint",
		URL:           "https://example.com/webhook",
		EventType:     "bench.test",
		Payload:       generateNestedPayload(),
		AttemptNumber: 1,
		DeliveryMode:  types.DeliveryModeAsync,
		MaxRetries:    5,
		RetryStrategy: types.RetryStrategyExponential,
		EnqueuedAt:    time.Now(),
	}

	ctx := context.Background()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		err := publisher.PublishWebhook(ctx, msg)
		if err != nil {
			b.Fatal(err)
		}
	}
}

