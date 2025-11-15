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
)

const (
	testPostgresURL  = "postgres://von:von_dev_password@localhost:5432/von_dev?sslmode=disable"
	testRabbitMQURL  = "amqp://von:von_dev_password@localhost:5672/"
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
	endpointID := uuid.New().String()
	eventID := uuid.New().String()
	deliveryID := uuid.New().String()

	app := types.Application{
		ID:             appID,
		OrganizationID: orgID,
		Name:           "Test App",
		UID:            "app_test",
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
	}

	if err := database.DB.Create(&app).Error; err != nil {
		t.Fatalf("failed to create application: %v", err)
	}

	endpoint := types.Endpoint{
		ID:            endpointID,
		ApplicationID: appID,
		UID:           "ep_test",
		URL:           server.URL,
		SigningAlgo:   types.SignatureAlgoSHA256,
		Secrets: types.JSONB{
			"current": "test-secret-key",
		},
		Status:         types.EndpointStatusHealthy,
		HealthScore:    100,
		RetryStrategy:  types.RetryStrategyExponential,
		MaxRetries:     3,
		TimeoutSeconds: 30,
		FilterMode:     types.FilterModeAllow,
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
	}

	if err := database.DB.Create(&endpoint).Error; err != nil {
		t.Fatalf("failed to create endpoint: %v", err)
	}

	event := types.Event{
		ID:             eventID,
		ApplicationID:  appID,
		OrganizationID: orgID,
		EventType:      "user.created",
		EventVersion:   "1",
		Payload: types.JSONB{
			"user_id":  "12345",
			"username": "testuser",
			"email":    "test@example.com",
		},
		PayloadSize:  100,
		DeliveryMode: types.DeliveryModeAsync,
		CreatedAt:    time.Now(),
	}

	if err := database.DB.Create(&event).Error; err != nil {
		t.Fatalf("failed to create event: %v", err)
	}

	delivery := types.EventDelivery{
		ID:          deliveryID,
		EventID:     eventID,
		EndpointID:  endpointID,
		Status:      types.DeliveryStatusQueued,
		AttemptCount: 0,
		MaxAttempts: 3,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	if err := database.DB.Create(&delivery).Error; err != nil {
		t.Fatalf("failed to create delivery: %v", err)
	}

	publisher, err := queue.NewPublisher(testRabbitMQURL)
	if err != nil {
		t.Fatalf("failed to create publisher: %v", err)
	}
	defer publisher.Close()

	msg := types.QueueMessage{
		DeliveryID:    deliveryID,
		EventID:       eventID,
		EndpointID:    endpointID,
		URL:           server.URL,
		EventType:     "user.created",
		Payload:       event.Payload,
		Headers:       map[string]string{},
		Secret:        "test-secret-key",
		AttemptNumber: 1,
		DeliveryMode:  types.DeliveryModeAsync,
		MaxRetries:    3,
		RetryStrategy: types.RetryStrategyExponential,
		EnqueuedAt:    time.Now(),
	}

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
	if err := database.DB.Where("id = ?", deliveryID).First(&updatedDelivery).Error; err != nil {
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
	endpointID := uuid.New().String()
	eventID := uuid.New().String()
	deliveryID := uuid.New().String()

	app := types.Application{
		ID:             appID,
		OrganizationID: orgID,
		Name:           "Test App",
		UID:            "app_retry",
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
	}
	database.DB.Create(&app)

	endpoint := types.Endpoint{
		ID:            endpointID,
		ApplicationID: appID,
		UID:           "ep_retry",
		URL:           server.URL,
		SigningAlgo:   types.SignatureAlgoSHA256,
		Secrets: types.JSONB{
			"current": "test-secret",
		},
		Status:         types.EndpointStatusHealthy,
		HealthScore:    100,
		RetryStrategy:  types.RetryStrategyExponential,
		MaxRetries:     5,
		TimeoutSeconds: 30,
		FilterMode:     types.FilterModeAllow,
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
	}
	database.DB.Create(&endpoint)

	event := types.Event{
		ID:             eventID,
		ApplicationID:  appID,
		OrganizationID: orgID,
		EventType:      "test.retry",
		EventVersion:   "1",
		Payload:        types.JSONB{"test": "data"},
		PayloadSize:    50,
		DeliveryMode:   types.DeliveryModeAsync,
		CreatedAt:      time.Now(),
	}
	database.DB.Create(&event)

	delivery := types.EventDelivery{
		ID:          deliveryID,
		EventID:     eventID,
		EndpointID:  endpointID,
		Status:      types.DeliveryStatusQueued,
		AttemptCount: 0,
		MaxAttempts: 5,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}
	database.DB.Create(&delivery)

	publisher, err := queue.NewPublisher(testRabbitMQURL)
	if err != nil {
		t.Fatalf("failed to create publisher: %v", err)
	}
	defer publisher.Close()

	msg := types.QueueMessage{
		DeliveryID:    deliveryID,
		EventID:       eventID,
		EndpointID:    endpointID,
		URL:           server.URL,
		EventType:     "test.retry",
		Payload:       event.Payload,
		Headers:       map[string]string{},
		Secret:        "test-secret",
		AttemptNumber: 1,
		DeliveryMode:  types.DeliveryModeAsync,
		MaxRetries:    5,
		RetryStrategy: types.RetryStrategyExponential,
		EnqueuedAt:    time.Now(),
	}

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
	database.DB.Where("id = ?", deliveryID).First(&updatedDelivery)

	if updatedDelivery.Status != types.DeliveryStatusDelivered {
		t.Errorf("expected status delivered after retries, got %s", updatedDelivery.Status)
	}
}
