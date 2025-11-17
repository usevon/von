package e2e_test

import (
	"context"
	"net/http"
	"net/http/httptest"
	"sync/atomic"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/usevon/von/internal/db"
	"github.com/usevon/von/internal/queue"
	"github.com/usevon/von/internal/worker"
	"github.com/usevon/von/pkg/types"
	"github.com/usevon/von/tests/util"
)

func TestCircuitBreakerIntegration(t *testing.T) {
	database, err := db.New(testPostgresURL)
	if err != nil {
		t.Fatalf("failed to connect to database: %v", err)
	}

	if err := database.AutoMigrate(); err != nil {
		t.Fatalf("failed to run migrations: %v", err)
	}

	if err := queue.EnsureQueues(testRabbitMQURL); err != nil {
		t.Fatalf("failed to ensure queues: %v", err)
	}

	var attemptCount atomic.Int32
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		attemptCount.Add(1)
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer server.Close()

	orgID := uuid.New().String()
	appID := uuid.New().String()

	app := util.NewTestApplication(
		util.WithAppID(appID),
		util.WithOrganizationID(orgID),
	)
	util.Must(t, database.DB.Create(&app))

	endpoint := util.NewTestEndpoint(
		util.WithApplicationID(appID),
		util.WithURL(server.URL),
		util.WithEndpointMaxRetries(10),
	)
	util.Must(t, database.DB.Create(&endpoint))

	w, err := worker.NewWorker(database.DB, testRabbitMQURL, 5*time.Second)
	if err != nil {
		t.Fatalf("failed to create worker: %v", err)
	}
	defer w.Stop()

	publisher, err := queue.NewPublisher(testRabbitMQURL)
	if err != nil {
		t.Fatalf("failed to create publisher: %v", err)
	}
	defer publisher.Close()

	ctx := context.Background()

	for i := 0; i < 7; i++ {
		event := util.NewTestEvent(
			util.WithEventApplicationID(appID),
			util.WithEventOrganizationID(orgID),
			util.WithEventPayload(types.JSONB{"attempt": i}),
		)
		util.Must(t, database.DB.Create(&event))

		delivery := util.NewTestDelivery(
			util.WithEventIDForDelivery(event.ID),
			util.WithEndpointIDForDelivery(endpoint.ID),
			util.WithMaxAttempts(10),
		)
		util.Must(t, database.DB.Create(&delivery))

		msg := util.NewTestMessage(
			util.WithDeliveryID(delivery.ID),
			util.WithMessageEventID(event.ID),
			util.WithMessageEndpointID(endpoint.ID),
			util.WithMessageURL(server.URL),
			util.WithPayload(event.Payload),
			util.WithMaxRetries(10),
		)

		if err := publisher.PublishWebhook(ctx, &msg); err != nil {
			t.Fatalf("failed to publish webhook: %v", err)
		}
	}

	time.Sleep(5 * time.Second)

	attempts := attemptCount.Load()
	if attempts >= 7 {
		t.Errorf("circuit breaker failed to open - expected fewer than 7 attempts, got %d", attempts)
	}

	if attempts < 5 {
		t.Errorf("circuit breaker opened too early - expected at least 5 attempts, got %d", attempts)
	}

	var updatedEndpoint types.Endpoint
	util.Must(t, database.DB.Where("id = ?", endpoint.ID).First(&updatedEndpoint))

	if updatedEndpoint.HealthScore >= 100 {
		t.Errorf("expected health score to decrease after failures, got %d", updatedEndpoint.HealthScore)
	}

	if updatedEndpoint.ConsecutiveFails == 0 {
		t.Errorf("expected consecutive failures to be tracked, got %d", updatedEndpoint.ConsecutiveFails)
	}

	t.Logf("Circuit breaker integration test passed: %d attempts, health score=%d, consecutive fails=%d",
		attempts, updatedEndpoint.HealthScore, updatedEndpoint.ConsecutiveFails)
}
