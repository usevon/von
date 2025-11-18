package api_test

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http/httptest"
	"testing"

	"github.com/google/uuid"
	"github.com/usevon/von/internal/api"
	"github.com/usevon/von/internal/db"
	"github.com/usevon/von/pkg/types"
	"github.com/usevon/von/tests/util"
)

type benchmarkPublisher struct{}

func (m *benchmarkPublisher) PublishWebhook(ctx context.Context, msg *types.QueueMessage) error {
	return nil
}

func (m *benchmarkPublisher) Close() {}

type benchmarkFixture struct {
	server *api.Server
	db     *db.DB
	orgID  string
	appID  string
}

func setupBenchmarkServer(b *testing.B) *benchmarkFixture {
	b.Helper()

	database := util.SetupBenchmarkDatabase(b)
	publisher := &benchmarkPublisher{}
	server := api.NewServerWithoutLogging(database.DB, publisher)

	orgID := uuid.New().String()
	appID := uuid.New().String()

	app := util.NewTestApplication(
		util.WithAppID(appID),
		util.WithOrganizationID(orgID),
	)
	app.Name = "Benchmark App"

	if err := database.DB.Create(&app).Error; err != nil {
		b.Fatal(err)
	}

	return &benchmarkFixture{
		server: server,
		db:     database,
		orgID:  orgID,
		appID:  appID,
	}
}

// BenchmarkCreateEventHandler benchmarks the POST /v1/events endpoint.
// This is the most critical API endpoint.
func BenchmarkCreateEventHandler(b *testing.B) {
	fixture := setupBenchmarkServer(b)

	// Create endpoint to match the event
	endpoint := util.NewTestEndpoint(
		util.WithApplicationID(fixture.appID),
	)
	endpoint.EventFilters = types.JSONB{"filters": []interface{}{"test.*"}}
	if err := fixture.db.Create(&endpoint).Error; err != nil {
		b.Fatal(err)
	}

	eventPayload := map[string]interface{}{
		"application_id": fixture.appID,
		"event_type":     "test.event",
		"payload": map[string]interface{}{
			"user_id": "user_123",
			"action":  "test_action",
		},
	}

	bodyBytes, _ := json.Marshal(eventPayload)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		req := httptest.NewRequest("POST", "/v1/events", bytes.NewReader(bodyBytes))
		req.Header.Set("Content-Type", "application/json")
		rr := httptest.NewRecorder()
		fixture.server.Handler().ServeHTTP(rr, req)

		if rr.Code != 201 {
			b.Fatalf("expected status 201, got %d", rr.Code)
		}
	}
}

// BenchmarkCreateEventHandlerMultipleEndpoints benchmarks event creation with multiple matching endpoints.
func BenchmarkCreateEventHandlerMultipleEndpoints(b *testing.B) {
	fixture := setupBenchmarkServer(b)

	// Create 10 endpoints that will all match
	for i := 0; i < 10; i++ {
		endpoint := util.NewTestEndpoint(
			util.WithApplicationID(fixture.appID),
		)
		endpoint.EventFilters = types.JSONB{"filters": []interface{}{"test.*"}}
		if err := fixture.db.Create(&endpoint).Error; err != nil {
			b.Fatal(err)
		}
	}

	eventPayload := map[string]interface{}{
		"application_id": fixture.appID,
		"event_type":     "test.event",
		"payload":        map[string]interface{}{"test": "data"},
	}

	bodyBytes, _ := json.Marshal(eventPayload)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		req := httptest.NewRequest("POST", "/v1/events", bytes.NewReader(bodyBytes))
		req.Header.Set("Content-Type", "application/json")
		rr := httptest.NewRecorder()
		fixture.server.Handler().ServeHTTP(rr, req)

		if rr.Code != 201 {
			b.Fatalf("expected status 201, got %d", rr.Code)
		}
	}
}

// BenchmarkCreateEventHandlerLargePayload benchmarks event creation with large payload.
func BenchmarkCreateEventHandlerLargePayload(b *testing.B) {
	fixture := setupBenchmarkServer(b)

	endpoint := util.NewTestEndpoint(
		util.WithApplicationID(fixture.appID),
	)
	endpoint.EventFilters = types.JSONB{"filters": []interface{}{"test.*"}}
	if err := fixture.db.Create(&endpoint).Error; err != nil {
		b.Fatal(err)
	}

	eventPayload := map[string]interface{}{
		"application_id": fixture.appID,
		"event_type":     "test.event",
		"payload":        util.BenchmarkPayload(100), // 100KB payload
	}

	bodyBytes, _ := json.Marshal(eventPayload)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		req := httptest.NewRequest("POST", "/v1/events", bytes.NewReader(bodyBytes))
		req.Header.Set("Content-Type", "application/json")
		rr := httptest.NewRecorder()
		fixture.server.Handler().ServeHTTP(rr, req)

		if rr.Code != 201 {
			b.Fatalf("expected status 201, got %d", rr.Code)
		}
	}
}

// BenchmarkListDeliveriesHandler benchmarks the GET /v1/deliveries endpoint.
func BenchmarkListDeliveriesHandler(b *testing.B) {
	fixture := setupBenchmarkServer(b)

	// Create test data: 100 deliveries
	endpoint := util.NewTestEndpoint(util.WithApplicationID(fixture.appID))
	if err := fixture.db.Create(&endpoint).Error; err != nil {
		b.Fatal(err)
	}

	event := util.NewTestEvent(
		util.WithEventApplicationID(fixture.appID),
		util.WithEventOrganizationID(fixture.orgID),
	)
	if err := fixture.db.Create(&event).Error; err != nil {
		b.Fatal(err)
	}

	for i := 0; i < 100; i++ {
		delivery := util.NewTestDelivery(
			util.WithEventIDForDelivery(event.ID),
			util.WithEndpointIDForDelivery(endpoint.ID),
		)
		if err := fixture.db.Create(&delivery).Error; err != nil {
			b.Fatal(err)
		}
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		req := httptest.NewRequest("GET", "/v1/deliveries?endpoint_id="+endpoint.ID, nil)
		rr := httptest.NewRecorder()
		fixture.server.Handler().ServeHTTP(rr, req)

		if rr.Code != 200 {
			b.Fatalf("expected status 200, got %d", rr.Code)
		}
	}
}

// BenchmarkCreateEndpointHandler benchmarks the POST /v1/endpoints endpoint.
func BenchmarkCreateEndpointHandler(b *testing.B) {
	fixture := setupBenchmarkServer(b)

	endpointPayload := map[string]interface{}{
		"application_id": fixture.appID,
		"url":            "https://example.com/webhook",
		"description":    "Test endpoint",
		"event_filters":  []string{"test.*"},
	}

	bodyBytes, _ := json.Marshal(endpointPayload)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		req := httptest.NewRequest("POST", "/v1/endpoints", bytes.NewReader(bodyBytes))
		req.Header.Set("Content-Type", "application/json")
		rr := httptest.NewRecorder()
		fixture.server.Handler().ServeHTTP(rr, req)

		if rr.Code != 201 {
			b.Fatalf("expected status 201, got %d", rr.Code)
		}
	}
}

// BenchmarkListEndpointsHandler benchmarks the GET /v1/endpoints endpoint.
func BenchmarkListEndpointsHandler(b *testing.B) {
	fixture := setupBenchmarkServer(b)

	// Create 50 endpoints
	for i := 0; i < 50; i++ {
		endpoint := util.NewTestEndpoint(util.WithApplicationID(fixture.appID))
		if err := fixture.db.Create(&endpoint).Error; err != nil {
			b.Fatal(err)
		}
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		req := httptest.NewRequest("GET", "/v1/endpoints?application_id="+fixture.appID, nil)
		rr := httptest.NewRecorder()
		fixture.server.Handler().ServeHTTP(rr, req)

		if rr.Code != 200 {
			b.Fatalf("expected status 200, got %d", rr.Code)
		}
	}
}

// BenchmarkRetryDeliveryHandler benchmarks the POST /v1/deliveries/{id}/retry endpoint.
func BenchmarkRetryDeliveryHandler(b *testing.B) {
	fixture := setupBenchmarkServer(b)

	endpoint := util.NewTestEndpoint(util.WithApplicationID(fixture.appID))
	if err := fixture.db.Create(&endpoint).Error; err != nil {
		b.Fatal(err)
	}

	event := util.NewTestEvent(
		util.WithEventApplicationID(fixture.appID),
		util.WithEventOrganizationID(fixture.orgID),
	)
	if err := fixture.db.Create(&event).Error; err != nil {
		b.Fatal(err)
	}

	delivery := util.NewTestDelivery(
		util.WithEventIDForDelivery(event.ID),
		util.WithEndpointIDForDelivery(endpoint.ID),
		util.WithDeliveryStatus(types.DeliveryStatusFailed),
	)
	if err := fixture.db.Create(&delivery).Error; err != nil {
		b.Fatal(err)
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		// Reset delivery status before each retry
		delivery.Status = types.DeliveryStatusFailed
		if err := fixture.db.Save(&delivery).Error; err != nil {
			b.Fatal(err)
		}

		req := httptest.NewRequest("POST", "/v1/deliveries/"+delivery.ID+"/retry", nil)
		rr := httptest.NewRecorder()
		fixture.server.Handler().ServeHTTP(rr, req)

		if rr.Code != 200 {
			b.Fatalf("expected status 200, got %d", rr.Code)
		}
	}
}
