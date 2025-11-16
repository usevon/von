package e2e_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/usevon/von/internal/db"
	"github.com/usevon/von/internal/queue"
	"github.com/usevon/von/internal/worker"
	"github.com/usevon/von/pkg/types"
	"github.com/usevon/von/tests/util"
)

var (
	testPostgresURL = util.GetPostgresURL()
	testRabbitMQURL = util.GetRabbitMQURL()
)

func TestEndToEndWebhookDelivery(t *testing.T) {
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

	received := make(chan map[string]interface{}, 1)
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var payload map[string]interface{}
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			t.Errorf("failed to decode payload: %v", err)
			w.WriteHeader(http.StatusBadRequest)
			return
		}

		signature := r.Header.Get("X-Von-Signature")
		if signature == "" {
			t.Error("missing signature header")
		}

		received <- payload
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"success"}`))
	}))
	defer server.Close()

	orgID := uuid.New().String()
	appID := uuid.New().String()

	app := util.NewTestApplication(
		util.WithAppID(appID),
		util.WithOrganizationID(orgID),
		util.WithAppName("Test App"),
	)

	if err := database.DB.Create(&app).Error; err != nil {
		t.Fatalf("failed to create application: %v", err)
	}

	endpoint := util.NewTestEndpoint(
		util.WithApplicationID(appID),
		util.WithURL(server.URL),
		util.WithSecret("test-secret-key"),
		util.WithEndpointMaxRetries(3),
	)

	if err := database.DB.Create(&endpoint).Error; err != nil {
		t.Fatalf("failed to create endpoint: %v", err)
	}

	event := util.NewTestEvent(
		util.WithEventApplicationID(appID),
		util.WithEventOrganizationID(orgID),
		util.WithEventTypeForEvent("user.created"),
		util.WithEventPayload(types.JSONB{
			"user_id":  "12345",
			"username": "testuser",
			"email":    "test@example.com",
		}),
	)

	if err := database.DB.Create(&event).Error; err != nil {
		t.Fatalf("failed to create event: %v", err)
	}

	delivery := util.NewTestDelivery(
		util.WithEventIDForDelivery(event.ID),
		util.WithEndpointIDForDelivery(endpoint.ID),
		util.WithMaxAttempts(3),
	)

	if err := database.DB.Create(&delivery).Error; err != nil {
		t.Fatalf("failed to create delivery: %v", err)
	}

	publisher, err := queue.NewPublisher(testRabbitMQURL)
	if err != nil {
		t.Fatalf("failed to create publisher: %v", err)
	}
	defer publisher.Close()

	msg := util.NewTestMessage(
		util.WithDeliveryID(delivery.ID),
		util.WithMessageEventID(event.ID),
		util.WithMessageEndpointID(endpoint.ID),
		util.WithMessageURL(server.URL),
		util.WithEventType("user.created"),
		util.WithPayload(event.Payload),
		util.WithMessageSecret("test-secret-key"),
		util.WithMaxRetries(3),
	)

	ctx := context.Background()
	if err := publisher.PublishWebhook(ctx, msg); err != nil {
		t.Fatalf("failed to publish webhook: %v", err)
	}

	w, err := worker.NewWorker(database.DB, testRabbitMQURL, 30*time.Second)
	if err != nil {
		t.Fatalf("failed to create worker: %v", err)
	}
	defer w.Stop()

	select {
	case payload := <-received:
		if payload["user_id"] != "12345" {
			t.Errorf("expected user_id 12345, got %v", payload["user_id"])
		}
		if payload["username"] != "testuser" {
			t.Errorf("expected username testuser, got %v", payload["username"])
		}
	case <-time.After(10 * time.Second):
		t.Fatal("timeout waiting for webhook delivery")
	}

	time.Sleep(1 * time.Second)

	var updatedDelivery types.EventDelivery
	if err := database.DB.Where("id = ?", delivery.ID).First(&updatedDelivery).Error; err != nil {
		t.Fatalf("failed to fetch updated delivery: %v", err)
	}

	if updatedDelivery.Status != types.DeliveryStatusDelivered {
		t.Errorf("expected status delivered, got %s", updatedDelivery.Status)
	}

	if updatedDelivery.AttemptCount != 1 {
		t.Errorf("expected 1 attempt, got %d", updatedDelivery.AttemptCount)
	}

	if updatedDelivery.DeliveredAt == nil {
		t.Error("expected DeliveredAt to be set")
	}
}

func TestWebhookRetry(t *testing.T) {
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

	attempts := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		attempts++
		if attempts < 3 {
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"success"}`))
	}))
	defer server.Close()

	orgID := uuid.New().String()
	appID := uuid.New().String()

	app := util.NewTestApplication(
		util.WithAppID(appID),
		util.WithOrganizationID(orgID),
		util.WithAppName("Test App"),
		util.WithAppUID("app_retry"),
	)
	database.DB.Create(&app)

	endpoint := util.NewTestEndpoint(
		util.WithApplicationID(appID),
		util.WithURL(server.URL),
		util.WithEndpointUID("ep_retry"),
		util.WithSecret("test-secret"),
		util.WithEndpointMaxRetries(5),
	)
	database.DB.Create(&endpoint)

	event := util.NewTestEvent(
		util.WithEventApplicationID(appID),
		util.WithEventOrganizationID(orgID),
		util.WithEventTypeForEvent("test.retry"),
		util.WithEventPayload(types.JSONB{"test": "data"}),
	)
	database.DB.Create(&event)

	delivery := util.NewTestDelivery(
		util.WithEventIDForDelivery(event.ID),
		util.WithEndpointIDForDelivery(endpoint.ID),
		util.WithMaxAttempts(5),
	)
	database.DB.Create(&delivery)

	publisher, err := queue.NewPublisher(testRabbitMQURL)
	if err != nil {
		t.Fatalf("failed to create publisher: %v", err)
	}
	defer publisher.Close()

	msg := util.NewTestMessage(
		util.WithDeliveryID(delivery.ID),
		util.WithMessageEventID(event.ID),
		util.WithMessageEndpointID(endpoint.ID),
		util.WithMessageURL(server.URL),
		util.WithEventType("test.retry"),
		util.WithPayload(event.Payload),
		util.WithMessageSecret("test-secret"),
		util.WithMaxRetries(5),
	)

	ctx := context.Background()
	if err := publisher.PublishWebhook(ctx, msg); err != nil {
		t.Fatalf("failed to publish webhook: %v", err)
	}

	w, err := worker.NewWorker(database.DB, testRabbitMQURL, 30*time.Second)
	if err != nil {
		t.Fatalf("failed to create worker: %v", err)
	}
	defer w.Stop()

	time.Sleep(15 * time.Second)

	if attempts < 3 {
		t.Errorf("expected at least 3 attempts, got %d", attempts)
	}

	var updatedDelivery types.EventDelivery
	database.DB.Where("id = ?", delivery.ID).First(&updatedDelivery)

	if updatedDelivery.Status != types.DeliveryStatusDelivered {
		t.Errorf("expected status delivered after retries, got %s", updatedDelivery.Status)
	}
}
