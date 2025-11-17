package util

import (
	"context"
	"io"
	"log"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/usevon/von/internal/db"
	"github.com/usevon/von/internal/queue"
	"github.com/usevon/von/internal/worker"
	"github.com/usevon/von/pkg/types"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// SetupBenchmarkPublisher creates a queue publisher for benchmarks.
// Automatically silences logs and handles cleanup.
func SetupBenchmarkPublisher(b *testing.B) *queue.Publisher {
	b.Helper()

	log.SetOutput(io.Discard)
	b.Cleanup(func() {
		log.SetOutput(os.Stderr)
	})

	publisher, err := queue.NewPublisher(GetRabbitMQURL())
	if err != nil {
		b.Fatal(err)
	}

	b.Cleanup(func() {
		publisher.Close()
	})

	return publisher
}

// SetupBenchmarkDatabase creates a database connection for benchmarks.
// Automatically runs migrations, silences logs, and handles cleanup.
func SetupBenchmarkDatabase(b *testing.B) *db.DB {
	b.Helper()

	log.SetOutput(io.Discard)
	b.Cleanup(func() {
		log.SetOutput(os.Stderr)
	})

	database, err := db.New(GetPostgresURL())
	if err != nil {
		b.Fatalf("failed to connect to database: %v", err)
	}

	// Disable GORM logging
	database.DB = database.DB.Session(&gorm.Session{Logger: logger.Default.LogMode(logger.Silent)})

	if err := database.AutoMigrate(); err != nil {
		b.Fatalf("failed to run migrations: %v", err)
	}

	b.Cleanup(func() {
		sqlDB, _ := database.DB.DB()
		if sqlDB != nil {
			sqlDB.Close()
		}
	})

	return database
}

// SetupBenchmarkWorker creates a worker instance for benchmarks.
// Automatically handles cleanup.
func SetupBenchmarkWorker(b *testing.B, database *db.DB) *worker.Worker {
	b.Helper()

	log.SetOutput(io.Discard)
	b.Cleanup(func() {
		log.SetOutput(os.Stderr)
	})

	w, err := worker.NewWorker(database.DB, GetRabbitMQURL(), 30*time.Second)
	if err != nil {
		b.Fatalf("failed to create worker: %v", err)
	}

	b.Cleanup(func() {
		w.Stop()
	})

	return w
}

// SetupBenchmarkHTTPServer creates a mock HTTP server for benchmarks.
// The server returns 200 OK for all requests by default.
// Pass a custom handler to override the default behavior.
func SetupBenchmarkHTTPServer(b *testing.B, handler http.Handler) *httptest.Server {
	b.Helper()

	if handler == nil {
		handler = http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
			w.Write([]byte(`{"status":"ok"}`))
		})
	}

	server := httptest.NewServer(handler)

	b.Cleanup(func() {
		server.Close()
	})

	return server
}

// NewBenchmarkMessage creates a queue message optimized for benchmarks.
// Uses static values where possible to reduce allocation overhead.
func NewBenchmarkMessage(opts ...func(*types.QueueMessage)) types.QueueMessage {
	msg := types.QueueMessage{
		DeliveryID:    "bench-delivery",
		EventID:       "bench-event",
		EndpointID:    "bench-endpoint",
		URL:           "https://example.com/webhook",
		EventType:     "bench.test",
		Payload:       map[string]interface{}{"data": "test"},
		Headers:       map[string]string{},
		Secret:        "bench-secret",
		AttemptNumber: 1,
		DeliveryMode:  types.DeliveryModeAsync,
		MaxRetries:    5,
		RetryStrategy: types.RetryStrategyExponential,
		EnqueuedAt:    time.Now(),
	}

	for _, opt := range opts {
		opt(&msg)
	}

	return msg
}

// GenerateBenchmarkMessages creates multiple queue messages for batch benchmarks.
func GenerateBenchmarkMessages(count int, opts ...func(*types.QueueMessage)) []*types.QueueMessage {
	messages := make([]*types.QueueMessage, count)
	for i := 0; i < count; i++ {
		msg := NewBenchmarkMessage(opts...)
		messages[i] = &msg
	}
	return messages
}

// BenchmarkPayload generates a payload of the specified size in KB.
// Useful for testing performance impact of payload size.
func BenchmarkPayload(sizeKB int) map[string]interface{} {
	payload := make(map[string]interface{})
	dataSize := sizeKB * 1024
	payload["data"] = strings.Repeat("x", dataSize/2)
	payload["timestamp"] = time.Now().Unix()
	payload["event_id"] = "bench-event-123"
	return payload
}

// BenchmarkFlatPayload generates a simple flat JSON structure.
// Useful for baseline performance testing.
func BenchmarkFlatPayload() map[string]interface{} {
	return map[string]interface{}{
		"user_id":    "user_123",
		"event_type": "user.created",
		"timestamp":  time.Now().Unix(),
		"email":      "user@example.com",
		"name":       "Test User",
	}
}

// BenchmarkNestedPayload generates a deeply nested JSON structure.
// Useful for testing JSON serialization overhead.
func BenchmarkNestedPayload() map[string]interface{} {
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

// BenchmarkRealisticPayload generates a realistic webhook payload.
// Simulates a typical e-commerce order webhook.
func BenchmarkRealisticPayload() map[string]interface{} {
	return map[string]interface{}{
		"order_id":     "ord_1234567890",
		"customer_id":  "cust_9876543210",
		"status":       "completed",
		"total_amount": 99.99,
		"currency":     "USD",
		"items": []interface{}{
			map[string]interface{}{
				"product_id": "prod_123",
				"name":       "Test Product",
				"quantity":   2,
				"price":      49.99,
			},
		},
		"shipping_address": map[string]interface{}{
			"street":  "123 Main St",
			"city":    "San Francisco",
			"state":   "CA",
			"zip":     "94105",
			"country": "US",
		},
		"created_at": time.Now().Unix(),
	}
}

// WithBenchPayload sets a custom payload for benchmark messages.
func WithBenchPayload(payload map[string]interface{}) func(*types.QueueMessage) {
	return func(m *types.QueueMessage) {
		m.Payload = payload
	}
}

// WithBenchURL sets a custom URL for benchmark messages.
func WithBenchURL(url string) func(*types.QueueMessage) {
	return func(m *types.QueueMessage) {
		m.URL = url
	}
}

// WithDeliveryID sets the delivery ID for benchmark messages.
func WithDeliveryID(id string) func(*types.QueueMessage) {
	return func(m *types.QueueMessage) {
		m.DeliveryID = id
	}
}

// WithMessageEventID sets the event ID for benchmark messages.
func WithMessageEventID(id string) func(*types.QueueMessage) {
	return func(m *types.QueueMessage) {
		m.EventID = id
	}
}

// WithMessageEndpointID sets the endpoint ID for benchmark messages.
func WithMessageEndpointID(id string) func(*types.QueueMessage) {
	return func(m *types.QueueMessage) {
		m.EndpointID = id
	}
}

// WithMessageSecret sets the secret for benchmark messages.
func WithMessageSecret(secret string) func(*types.QueueMessage) {
	return func(m *types.QueueMessage) {
		m.Secret = secret
	}
}

// BenchmarkContext returns a context suitable for benchmarks.
// Uses background context with no cancellation to avoid overhead.
func BenchmarkContext() context.Context {
	return context.Background()
}

// CleanupBenchmarkData removes test data from the database between benchmark iterations.
// This is optional but can help ensure consistent benchmark results.
func CleanupBenchmarkData(b *testing.B, database *db.DB) {
	b.Helper()
	database.DB.Exec("DELETE FROM event_delivery")
	database.DB.Exec("DELETE FROM endpoint")
	database.DB.Exec("DELETE FROM event")
	database.DB.Exec("DELETE FROM application")
}
