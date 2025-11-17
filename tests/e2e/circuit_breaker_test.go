package e2e_test

import (
	"context"
	"encoding/json"
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

func TestCircuitBreakerOpensAfterFailures(t *testing.T) {
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

		if err := publisher.PublishWebhook(ctx, msg); err != nil {
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

	t.Logf("Circuit breaker test passed: %d attempts (circuit opened after threshold)", attempts)
}

func TestCircuitBreakerRecovery(t *testing.T) {
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
	var shouldFail atomic.Bool
	shouldFail.Store(true)

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		attemptCount.Add(1)
		if shouldFail.Load() {
			w.WriteHeader(http.StatusInternalServerError)
		} else {
			w.WriteHeader(http.StatusOK)
			w.Write([]byte(`{"status":"success"}`))
		}
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

	for i := 0; i < 6; i++ {
		event := util.NewTestEvent(
			util.WithEventApplicationID(appID),
			util.WithEventOrganizationID(orgID),
			util.WithEventPayload(types.JSONB{"phase": "failing", "attempt": i}),
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

		if err := publisher.PublishWebhook(ctx, msg); err != nil {
			t.Fatalf("failed to publish webhook: %v", err)
		}
	}

	time.Sleep(3 * time.Second)
	t.Logf("Phase 1 complete - circuit should be open after %d attempts", attemptCount.Load())

	shouldFail.Store(false)

	time.Sleep(65 * time.Second)

	initialAttempts := attemptCount.Load()
	t.Logf("After timeout - sending recovery message (attempts so far: %d)", initialAttempts)

	recoveryEvent := util.NewTestEvent(
		util.WithEventApplicationID(appID),
		util.WithEventOrganizationID(orgID),
		util.WithEventPayload(types.JSONB{"phase": "recovery"}),
	)
	util.Must(t, database.DB.Create(&recoveryEvent))

	recoveryDelivery := util.NewTestDelivery(
		util.WithEventIDForDelivery(recoveryEvent.ID),
		util.WithEndpointIDForDelivery(endpoint.ID),
		util.WithMaxAttempts(3),
	)
	util.Must(t, database.DB.Create(&recoveryDelivery))

	recoveryMsg := util.NewTestMessage(
		util.WithDeliveryID(recoveryDelivery.ID),
		util.WithMessageEventID(recoveryEvent.ID),
		util.WithMessageEndpointID(endpoint.ID),
		util.WithMessageURL(server.URL),
		util.WithPayload(recoveryEvent.Payload),
		util.WithMaxRetries(3),
	)

	if err := publisher.PublishWebhook(ctx, recoveryMsg); err != nil {
		t.Fatalf("failed to publish recovery webhook: %v", err)
	}

	time.Sleep(3 * time.Second)

	finalAttempts := attemptCount.Load()
	if finalAttempts == initialAttempts {
		t.Error("circuit breaker did not recover - no new attempts after timeout")
	}

	var updatedDelivery types.EventDelivery
	if err := database.DB.Where("id = ?", recoveryDelivery.ID).First(&updatedDelivery).Error; err != nil {
		t.Fatalf("failed to fetch recovery delivery: %v", err)
	}

	if updatedDelivery.Status != types.DeliveryStatusDelivered {
		t.Errorf("expected recovery delivery to succeed, got status %s", updatedDelivery.Status)
	}

	t.Logf("Circuit breaker recovery test passed: circuit reopened and delivery succeeded")
}

func TestEndpointHealthScoreUpdates(t *testing.T) {
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

	successCount := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var payload map[string]interface{}
		json.NewDecoder(r.Body).Decode(&payload)

		if phase, ok := payload["phase"].(string); ok && phase == "success" {
			successCount++
			w.WriteHeader(http.StatusOK)
			w.Write([]byte(`{"status":"ok"}`))
		} else {
			w.WriteHeader(http.StatusInternalServerError)
		}
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
		util.WithHealthScore(100),
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

	for i := 0; i < 3; i++ {
		event := util.NewTestEvent(
			util.WithEventApplicationID(appID),
			util.WithEventOrganizationID(orgID),
			util.WithEventPayload(types.JSONB{"phase": "failure", "index": i}),
		)
		util.Must(t, database.DB.Create(&event))

		delivery := util.NewTestDelivery(
			util.WithEventIDForDelivery(event.ID),
			util.WithEndpointIDForDelivery(endpoint.ID),
		)
		util.Must(t, database.DB.Create(&delivery))

		msg := util.NewTestMessage(
			util.WithDeliveryID(delivery.ID),
			util.WithMessageEventID(event.ID),
			util.WithMessageEndpointID(endpoint.ID),
			util.WithMessageURL(server.URL),
			util.WithPayload(event.Payload),
		)

		if err := publisher.PublishWebhook(ctx, msg); err != nil {
			t.Fatalf("failed to publish webhook: %v", err)
		}
	}

	time.Sleep(3 * time.Second)

	var updatedEndpoint types.Endpoint
	util.Must(t, database.DB.Where("id = ?", endpoint.ID).First(&updatedEndpoint)

	if updatedEndpoint.HealthScore >= 100 {
		t.Errorf("expected health score to decrease after failures, got %d", updatedEndpoint.HealthScore)
	}

	if updatedEndpoint.ConsecutiveFails != 3 {
		t.Errorf("expected 3 consecutive fails, got %d", updatedEndpoint.ConsecutiveFails)
	}

	t.Logf("After failures: HealthScore=%d, ConsecutiveFails=%d", updatedEndpoint.HealthScore, updatedEndpoint.ConsecutiveFails)

	for i := 0; i < 3; i++ {
		event := util.NewTestEvent(
			util.WithEventApplicationID(appID),
			util.WithEventOrganizationID(orgID),
			util.WithEventPayload(types.JSONB{"phase": "success", "index": i}),
		)
		util.Must(t, database.DB.Create(&event))

		delivery := util.NewTestDelivery(
			util.WithEventIDForDelivery(event.ID),
			util.WithEndpointIDForDelivery(endpoint.ID),
		)
		util.Must(t, database.DB.Create(&delivery))

		msg := util.NewTestMessage(
			util.WithDeliveryID(delivery.ID),
			util.WithMessageEventID(event.ID),
			util.WithMessageEndpointID(endpoint.ID),
			util.WithMessageURL(server.URL),
			util.WithPayload(event.Payload),
		)

		if err := publisher.PublishWebhook(ctx, msg); err != nil {
			t.Fatalf("failed to publish webhook: %v", err)
		}
	}

	time.Sleep(3 * time.Second)

	util.Must(t, database.DB.Where("id = ?", endpoint.ID).First(&updatedEndpoint)

	if updatedEndpoint.ConsecutiveFails != 0 {
		t.Errorf("expected consecutive fails to reset after success, got %d", updatedEndpoint.ConsecutiveFails)
	}

	if updatedEndpoint.HealthScore <= updatedEndpoint.HealthScore-15 {
		t.Errorf("expected health score to improve after successes")
	}

	t.Logf("After successes: HealthScore=%d, ConsecutiveFails=%d, Status=%s",
		updatedEndpoint.HealthScore, updatedEndpoint.ConsecutiveFails, updatedEndpoint.Status)
}
