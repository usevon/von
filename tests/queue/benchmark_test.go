package queue_test

import (
	"context"
	"sync"
	"testing"
	"time"

	"github.com/usevon/von/internal/queue"
	"github.com/usevon/von/pkg/types"
)

func BenchmarkPublisher(b *testing.B) {
	err := queue.EnsureQueues(testRabbitMQURL)
	if err != nil {
		b.Fatal(err)
	}

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
	err := queue.EnsureQueues(testRabbitMQURL)
	if err != nil {
		b.Fatal(err)
	}

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

func BenchmarkConsumer(b *testing.B) {
	err := queue.EnsureQueues(testRabbitMQURL)
	if err != nil {
		b.Fatal(err)
	}

	publisher, err := queue.NewPublisher(testRabbitMQURL)
	if err != nil {
		b.Fatal(err)
	}
	defer publisher.Close()

	var wg sync.WaitGroup
	wg.Add(b.N)

	handler := func(ctx context.Context, msg types.QueueMessage) error {
		wg.Done()
		return nil
	}

	consumer, err := queue.NewConsumer(testRabbitMQURL, handler)
	if err != nil {
		b.Fatal(err)
	}
	defer consumer.Close()

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

	wg.Wait()
}

func BenchmarkEndToEnd(b *testing.B) {
	err := queue.EnsureQueues(testRabbitMQURL)
	if err != nil {
		b.Fatal(err)
	}

	publisher, err := queue.NewPublisher(testRabbitMQURL)
	if err != nil {
		b.Fatal(err)
	}
	defer publisher.Close()

	processed := make(chan struct{}, b.N)
	handler := func(ctx context.Context, msg types.QueueMessage) error {
		processed <- struct{}{}
		return nil
	}

	consumer, err := queue.NewConsumer(testRabbitMQURL, handler)
	if err != nil {
		b.Fatal(err)
	}
	defer consumer.Close()

	ctx := context.Background()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
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
		err := publisher.PublishWebhook(ctx, msg)
		if err != nil {
			b.Fatal(err)
		}
	}

	for i := 0; i < b.N; i++ {
		<-processed
	}
}
