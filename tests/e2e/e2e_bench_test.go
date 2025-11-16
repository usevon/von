package e2e_test

import (
	"testing"

	"github.com/usevon/von/internal/queue"
	"github.com/usevon/von/pkg/types"
	"github.com/usevon/von/tests/util"
)

// BenchmarkEndToEndSingleDelivery benchmarks the complete webhook delivery flow.
// Flow: Queue → Worker → HTTP delivery
func BenchmarkEndToEndSingleDelivery(b *testing.B) {
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
		util.WithSecret("test-secret"),
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
	for i := 0; i < b.N; i++ {
		// Create delivery
		delivery := util.NewTestDelivery(
			util.WithEventIDForDelivery(event.ID),
			util.WithEndpointIDForDelivery(endpoint.ID),
		)
		if err := database.Create(&delivery).Error; err != nil {
			b.Fatal(err)
		}

		// Create queue message
		msg := util.NewBenchmarkMessage(
			util.WithDeliveryID(delivery.ID),
			util.WithMessageEventID(event.ID),
			util.WithMessageEndpointID(endpoint.ID),
			util.WithBenchURL(server.URL),
			util.WithMessageSecret("test-secret"),
		)

		// Process delivery
		if err := w.HandleMessage(ctx, msg); err != nil {
			b.Fatal(err)
		}
	}
}

// BenchmarkEndToEndMultipleEndpoints benchmarks delivery to multiple endpoints (fan-out).
func BenchmarkEndToEndMultipleEndpoints(b *testing.B) {
	database := util.SetupBenchmarkDatabase(b)
	server := util.SetupBenchmarkHTTPServer(b, nil)
	w := util.SetupBenchmarkWorker(b, database)

	// Create test data
	app := util.NewTestApplication()
	if err := database.Create(&app).Error; err != nil {
		b.Fatal(err)
	}

	// Create 5 endpoints that will all receive the event
	endpoints := make([]types.Endpoint, 5)
	for i := 0; i < 5; i++ {
		endpoint := util.NewTestEndpoint(
			util.WithApplicationID(app.ID),
			util.WithURL(server.URL),
			util.WithSecret("test-secret"),
		)
		if err := database.Create(&endpoint).Error; err != nil {
			b.Fatal(err)
		}
		endpoints[i] = endpoint
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
	for i := 0; i < b.N; i++ {
		// Process delivery to all 5 endpoints
		for _, endpoint := range endpoints {
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
	}
}

// BenchmarkEndToEndHighConcurrency benchmarks concurrent webhook deliveries.
func BenchmarkEndToEndHighConcurrency(b *testing.B) {
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
		util.WithSecret("test-secret"),
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

// BenchmarkEndToEndLargePayload benchmarks delivery with large payloads.
func BenchmarkEndToEndLargePayload(b *testing.B) {
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
		util.WithSecret("test-secret"),
	)
	if err := database.Create(&endpoint).Error; err != nil {
		b.Fatal(err)
	}

	event := util.NewTestEvent(
		util.WithEventApplicationID(app.ID),
		util.WithEventOrganizationID(app.OrganizationID),
		util.WithEventPayload(util.BenchmarkPayload(100)), // 100KB payload
	)
	if err := database.Create(&event).Error; err != nil {
		b.Fatal(err)
	}

	ctx := util.BenchmarkContext()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
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
			util.WithBenchPayload(util.BenchmarkPayload(100)),
		)

		if err := w.HandleMessage(ctx, msg); err != nil {
			b.Fatal(err)
		}
	}
}

// BenchmarkEndToEndQueuePublishAndConsume benchmarks the full queue flow.
func BenchmarkEndToEndQueuePublishAndConsume(b *testing.B) {
	database := util.SetupBenchmarkDatabase(b)
	server := util.SetupBenchmarkHTTPServer(b, nil)
	publisher := util.SetupBenchmarkPublisher(b)

	// Ensure queues exist
	if err := queue.EnsureQueues(util.GetRabbitMQURL()); err != nil {
		b.Fatal(err)
	}

	// Create test data
	app := util.NewTestApplication()
	if err := database.Create(&app).Error; err != nil {
		b.Fatal(err)
	}

	endpoint := util.NewTestEndpoint(
		util.WithApplicationID(app.ID),
		util.WithURL(server.URL),
		util.WithSecret("test-secret"),
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
	for i := 0; i < b.N; i++ {
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

		// Publish to queue (simulates API layer)
		if err := publisher.PublishWebhook(ctx, msg); err != nil {
			b.Fatal(err)
		}
	}
}
