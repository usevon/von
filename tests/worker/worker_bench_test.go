package worker_test

import (
	"testing"
	"time"

	"github.com/usevon/von/internal/worker"
	"github.com/usevon/von/pkg/types"
	"github.com/usevon/von/tests/util"
)

// BenchmarkHandleMessage benchmarks the complete webhook delivery flow.
// This includes database lookups, HTTP delivery, and health score updates.
func BenchmarkHandleMessage(b *testing.B) {
	database := util.SetupBenchmarkDatabase(b)
	server := util.SetupBenchmarkHTTPServer(b, nil)
	w := util.SetupBenchmarkWorker(b, database)

	// Create test data
	app := util.NewTestApplication()
	if err := database.Create(&app).Error; err != nil {
		b.Fatal(err)
	}

	endpoint := util.NewTestEndpoint(
		util.WithApplicationID(app.ID),
		util.WithURL(server.URL),
	)
	if err := database.Create(&endpoint).Error; err != nil {
		b.Fatal(err)
	}

	event := util.NewTestEvent(
		util.WithEventApplicationID(app.ID),
		util.WithEventOrganizationID(app.OrganizationID),
	)
	if err := database.Create(&event).Error; err != nil {
		b.Fatal(err)
	}

	delivery := util.NewTestDelivery(
		util.WithEventIDForDelivery(event.ID),
		util.WithEndpointIDForDelivery(endpoint.ID),
	)
	if err := database.Create(&delivery).Error; err != nil {
		b.Fatal(err)
	}

	msg := util.NewBenchmarkMessage(
		util.WithDeliveryID(delivery.ID),
		util.WithMessageEventID(event.ID),
		util.WithMessageEndpointID(endpoint.ID),
		util.WithBenchURL(server.URL),
		util.WithMessageSecret("test-secret"),
	)

	ctx := util.BenchmarkContext()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		// Reset delivery status before each iteration
		delivery.Status = types.DeliveryStatusQueued
		delivery.AttemptCount = 0
		if err := database.DB.Save(&delivery).Error; err != nil {
			b.Fatal(err)
		}

		if err := w.HandleMessage(ctx, msg); err != nil {
			b.Fatal(err)
		}
	}
}

// BenchmarkHandleMessageParallel benchmarks concurrent webhook deliveries.
func BenchmarkHandleMessageParallel(b *testing.B) {
	database := util.SetupBenchmarkDatabase(b)
	server := util.SetupBenchmarkHTTPServer(b, nil)
	w := util.SetupBenchmarkWorker(b, database)

	// Create test data
	app := util.NewTestApplication()
	if err := database.Create(&app).Error; err != nil {
		b.Fatal(err)
	}

	endpoint := util.NewTestEndpoint(
		util.WithApplicationID(app.ID),
		util.WithURL(server.URL),
	)
	if err := database.Create(&endpoint).Error; err != nil {
		b.Fatal(err)
	}

	event := util.NewTestEvent(
		util.WithEventApplicationID(app.ID),
		util.WithEventOrganizationID(app.OrganizationID),
	)
	if err := database.Create(&event).Error; err != nil {
		b.Fatal(err)
	}

	ctx := util.BenchmarkContext()

	b.ResetTimer()
	b.RunParallel(func(pb *testing.PB) {
		for pb.Next() {
			// Create unique delivery for each iteration to avoid conflicts
			delivery := util.NewTestDelivery(
				util.WithEventIDForDelivery(event.ID),
				util.WithEndpointIDForDelivery(endpoint.ID),
			)
			if err := database.Create(&delivery).Error; err != nil {
				b.Fatal(err)
			}

			msg := util.NewBenchmarkMessage(
				util.WithDeliveryID(delivery.ID),
				util.WithMessageEventID(event.ID),
				util.WithMessageEndpointID(endpoint.ID),
				util.WithBenchURL(server.URL),
				util.WithMessageSecret("test-secret"),
			)

			if err := w.HandleMessage(ctx, msg); err != nil {
				b.Fatal(err)
			}
		}
	})
}

// BenchmarkDeliverWebhook benchmarks just the HTTP client delivery.
func BenchmarkDeliverWebhook(b *testing.B) {
	server := util.SetupBenchmarkHTTPServer(b, nil)
	client := worker.NewClient(30 * time.Second)

	msg := util.NewBenchmarkMessage(
		util.WithBenchURL(server.URL),
		util.WithMessageSecret("test-secret"),
	)

	ctx := util.BenchmarkContext()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		result := client.DeliverWebhook(ctx, msg)
		if !result.IsSuccessful() {
			b.Fatalf("delivery failed: %s", result.Error)
		}
	}
}

// BenchmarkDeliverWebhookParallel benchmarks concurrent HTTP deliveries.
func BenchmarkDeliverWebhookParallel(b *testing.B) {
	server := util.SetupBenchmarkHTTPServer(b, nil)
	client := worker.NewClient(30 * time.Second)

	msg := util.NewBenchmarkMessage(
		util.WithBenchURL(server.URL),
		util.WithMessageSecret("test-secret"),
	)

	ctx := util.BenchmarkContext()

	b.ResetTimer()
	b.RunParallel(func(pb *testing.PB) {
		for pb.Next() {
			result := client.DeliverWebhook(ctx, msg)
			if !result.IsSuccessful() {
				b.Fatalf("delivery failed: %s", result.Error)
			}
		}
	})
}

// BenchmarkDeliverWebhookLargePayload benchmarks delivery with 100KB payload.
func BenchmarkDeliverWebhookLargePayload(b *testing.B) {
	server := util.SetupBenchmarkHTTPServer(b, nil)
	client := worker.NewClient(30 * time.Second)

	msg := util.NewBenchmarkMessage(
		util.WithBenchURL(server.URL),
		util.WithMessageSecret("test-secret"),
		util.WithBenchPayload(util.BenchmarkPayload(100)),
	)

	ctx := util.BenchmarkContext()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		result := client.DeliverWebhook(ctx, msg)
		if !result.IsSuccessful() {
			b.Fatalf("delivery failed: %s", result.Error)
		}
	}
}
