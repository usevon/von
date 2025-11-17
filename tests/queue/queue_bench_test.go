package queue_test

import (
	"context"
	"testing"

	"github.com/usevon/von/tests/util"
)

func BenchmarkPublisher(b *testing.B) {
	publisher := util.SetupBenchmarkPublisher(b)
	msg := util.NewBenchmarkMessage()
	ctx := context.Background()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		err := publisher.PublishWebhook(ctx, &msg)
		if err != nil {
			b.Fatal(err)
		}
	}
}

func BenchmarkPublisherParallel(b *testing.B) {
	publisher := util.SetupBenchmarkPublisher(b)
	msg := util.NewBenchmarkMessage()
	ctx := context.Background()

	b.ResetTimer()
	b.RunParallel(func(pb *testing.PB) {
		for pb.Next() {
			err := publisher.PublishWebhook(ctx, &msg)
			if err != nil {
				b.Fatal(err)
			}
		}
	})
}

func BenchmarkPublisher1KB(b *testing.B) {
	publisher := util.SetupBenchmarkPublisher(b)
	msg := util.NewBenchmarkMessage(
		util.WithBenchPayload(util.BenchmarkPayload(1)),
	)
	ctx := context.Background()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		err := publisher.PublishWebhook(ctx, &msg)
		if err != nil {
			b.Fatal(err)
		}
	}
}

func BenchmarkPublisher10KB(b *testing.B) {
	publisher := util.SetupBenchmarkPublisher(b)
	msg := util.NewBenchmarkMessage(
		util.WithBenchPayload(util.BenchmarkPayload(10)),
	)
	ctx := context.Background()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		err := publisher.PublishWebhook(ctx, &msg)
		if err != nil {
			b.Fatal(err)
		}
	}
}

func BenchmarkPublisher100KB(b *testing.B) {
	publisher := util.SetupBenchmarkPublisher(b)
	msg := util.NewBenchmarkMessage(
		util.WithBenchPayload(util.BenchmarkPayload(100)),
	)
	ctx := context.Background()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		err := publisher.PublishWebhook(ctx, &msg)
		if err != nil {
			b.Fatal(err)
		}
	}
}

func BenchmarkPublisher1MB(b *testing.B) {
	publisher := util.SetupBenchmarkPublisher(b)
	msg := util.NewBenchmarkMessage(
		util.WithBenchPayload(util.BenchmarkPayload(1024)),
	)
	ctx := context.Background()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		err := publisher.PublishWebhook(ctx, &msg)
		if err != nil {
			b.Fatal(err)
		}
	}
}

func BenchmarkPublisherBatch(b *testing.B) {
	publisher := util.SetupBenchmarkPublisher(b)
	messages := util.GenerateBenchmarkMessages(100)
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
	publisher := util.SetupBenchmarkPublisher(b)
	msg := util.NewBenchmarkMessage(
		util.WithBenchPayload(util.BenchmarkFlatPayload()),
	)
	ctx := context.Background()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		err := publisher.PublishWebhook(ctx, &msg)
		if err != nil {
			b.Fatal(err)
		}
	}
}

func BenchmarkPublisherNestedJSON(b *testing.B) {
	publisher := util.SetupBenchmarkPublisher(b)
	msg := util.NewBenchmarkMessage(
		util.WithBenchPayload(util.BenchmarkNestedPayload()),
	)
	ctx := context.Background()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		err := publisher.PublishWebhook(ctx, &msg)
		if err != nil {
			b.Fatal(err)
		}
	}
}
