package api_test

import (
	"encoding/json"
	"net/http"
	"testing"

	"github.com/usevon/von/pkg/types"
	"github.com/usevon/von/tests/util"
)

func TestCreateEvent(t *testing.T) {
	ts := setupTestServer(t)
	defer ts.cleanup(t)

	endpoint := util.NewTestEndpoint(
		util.WithApplicationID(ts.appID),
		util.WithURL("https://example.com/webhook"),
		util.WithDescription("Test endpoint"),
		util.WithSecret("test-secret"),
		util.WithEventTypes("user.created"),
	)
	util.Must(t, ts.db.Create(&endpoint))

	req := map[string]interface{}{
		"application_id":  ts.appID,
		"organization_id": ts.orgID,
		"event_type":      "user.created",
		"payload": map[string]interface{}{
			"user_id": "123",
			"email":   "test@example.com",
		},
	}

	rr := ts.request("POST", "/v1/events", req)

	if rr.Code != http.StatusCreated {
		t.Errorf("expected status 201, got %d: %s", rr.Code, rr.Body.String())
	}

	var resp map[string]interface{}
	if err := json.NewDecoder(rr.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if resp["event_id"] == nil {
		t.Error("response missing event_id")
	}

	deliveryIDs, ok := resp["delivery_ids"].([]interface{})
	if !ok {
		t.Fatal("response missing delivery_ids array")
	}

	if len(deliveryIDs) != 1 {
		t.Errorf("expected 1 delivery, got %d", len(deliveryIDs))
	}

	if len(ts.publisher.messages) != 1 {
		t.Errorf("expected 1 message published, got %d", len(ts.publisher.messages))
	}

	msg := ts.publisher.messages[0]
	if msg.EventType != "user.created" {
		t.Errorf("expected event_type 'user.created', got %s", msg.EventType)
	}
}

func TestCreateEventWithFilters(t *testing.T) {
	ts := setupTestServer(t)
	defer ts.cleanup(t)

	matchingEndpoint := util.NewTestEndpoint(
		util.WithApplicationID(ts.appID),
		util.WithURL("https://example.com/webhook1"),
		util.WithSecrets(types.JSONB{"current": "secret1"}),
		util.WithFilterMode(types.FilterModeAllow),
		util.WithEventFilters(types.JSONB{
			"filters": []interface{}{"user.created", "user.updated"},
		}),
	)
	if err := ts.db.Create(&matchingEndpoint).Error; err != nil {
		t.Fatalf("failed to create matching endpoint: %v", err)
	}

	nonMatchingEndpoint := util.NewTestEndpoint(
		util.WithApplicationID(ts.appID),
		util.WithURL("https://example.com/webhook2"),
		util.WithSecrets(types.JSONB{"current": "secret2"}),
		util.WithFilterMode(types.FilterModeAllow),
		util.WithEventFilters(types.JSONB{
			"filters": []interface{}{"order.created"},
		}),
	)
	if err := ts.db.Create(&nonMatchingEndpoint).Error; err != nil {
		t.Fatalf("failed to create non-matching endpoint: %v", err)
	}

	req := map[string]interface{}{
		"application_id":  ts.appID,
		"organization_id": ts.orgID,
		"event_type":      "user.created",
		"payload": map[string]interface{}{
			"user_id": "123",
		},
	}

	rr := ts.request("POST", "/v1/events", req)

	if rr.Code != http.StatusCreated {
		t.Errorf("expected status 201, got %d: %s", rr.Code, rr.Body.String())
	}

	var resp map[string]interface{}
	if err := json.NewDecoder(rr.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	deliveryIDs, ok := resp["delivery_ids"].([]interface{})
	if !ok {
		t.Fatal("response missing delivery_ids array")
	}

	if len(deliveryIDs) != 1 {
		t.Errorf("expected 1 delivery (only matching endpoint), got %d", len(deliveryIDs))
	}
}

func TestCreateEventBlockMode(t *testing.T) {
	ts := setupTestServer(t)
	defer ts.cleanup(t)

	endpoint := util.NewTestEndpoint(
		util.WithApplicationID(ts.appID),
		util.WithURL("https://example.com/webhook"),
		util.WithSecrets(types.JSONB{"current": "secret"}),
		util.WithFilterMode(types.FilterModeBlock),
		util.WithEventFilters(types.JSONB{
			"filters": []interface{}{"user.deleted"},
		}),
	)
	util.Must(t, ts.db.Create(&endpoint))

	req := map[string]interface{}{
		"application_id":  ts.appID,
		"organization_id": ts.orgID,
		"event_type":      "user.created",
		"payload": map[string]interface{}{
			"user_id": "123",
		},
	}

	rr := ts.request("POST", "/v1/events", req)

	if rr.Code != http.StatusCreated {
		t.Errorf("expected status 201, got %d: %s", rr.Code, rr.Body.String())
	}

	var resp map[string]interface{}
	if err := json.NewDecoder(rr.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	deliveryIDs, ok := resp["delivery_ids"].([]interface{})
	if !ok {
		t.Fatal("response missing delivery_ids array")
	}

	if len(deliveryIDs) != 1 {
		t.Errorf("expected 1 delivery (block mode, event not in filters), got %d", len(deliveryIDs))
	}
}

func TestCreateEventValidation(t *testing.T) {
	ts := setupTestServer(t)
	defer ts.cleanup(t)

	tests := []struct {
		name           string
		req            map[string]interface{}
		expectedStatus int
	}{
		{
			name: "missing application_id",
			req: map[string]interface{}{
				"organization_id": ts.orgID,
				"event_type":      "test.event",
				"payload":         map[string]interface{}{"test": "data"},
			},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name: "missing event_type",
			req: map[string]interface{}{
				"application_id":  ts.appID,
				"organization_id": ts.orgID,
				"payload":         map[string]interface{}{"test": "data"},
			},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name: "missing payload",
			req: map[string]interface{}{
				"application_id":  ts.appID,
				"organization_id": ts.orgID,
				"event_type":      "test.event",
			},
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rr := ts.request("POST", "/v1/events", tt.req)
			if rr.Code != tt.expectedStatus {
				t.Errorf("expected status %d, got %d: %s", tt.expectedStatus, rr.Code, rr.Body.String())
			}
		})
	}
}

func TestCreateEventIdempotency(t *testing.T) {
	ts := setupTestServer(t)
	defer ts.cleanup(t)

	endpoint := util.NewTestEndpoint(
		util.WithApplicationID(ts.appID),
		util.WithURL("https://example.com/webhook"),
		util.WithSecrets(types.JSONB{"current": "test-secret"}),
		util.WithFilterMode(types.FilterModeAllow),
	)
	util.Must(t, ts.db.Create(&endpoint))

	req := map[string]interface{}{
		"application_id":  ts.appID,
		"organization_id": ts.orgID,
		"event_type":      "user.created",
		"payload": map[string]interface{}{
			"user_id": "123",
		},
	}

	idempotencyKey := "test-idempotency-key-123"

	rr1 := ts.requestWithHeader("POST", "/v1/events", req, map[string]string{
		"Idempotency-Key": idempotencyKey,
	})

	if rr1.Code != http.StatusCreated {
		t.Errorf("first request expected status 201, got %d: %s", rr1.Code, rr1.Body.String())
	}

	var resp1 map[string]interface{}
	if err := json.NewDecoder(rr1.Body).Decode(&resp1); err != nil {
		t.Fatalf("failed to decode first response: %v", err)
	}

	rr2 := ts.requestWithHeader("POST", "/v1/events", req, map[string]string{
		"Idempotency-Key": idempotencyKey,
	})

	if rr2.Code != http.StatusOK {
		t.Errorf("second request expected status 200 (cached), got %d: %s", rr2.Code, rr2.Body.String())
	}

	var resp2 map[string]interface{}
	if err := json.NewDecoder(rr2.Body).Decode(&resp2); err != nil {
		t.Fatalf("failed to decode second response: %v", err)
	}

	if resp1["event_id"] != resp2["event_id"] {
		t.Error("idempotent requests should return same event_id")
	}

	if len(ts.publisher.messages) != 1 {
		t.Errorf("expected 1 message published (deduplicated), got %d", len(ts.publisher.messages))
	}
}

func TestCreateEventNoMatchingEndpoints(t *testing.T) {
	ts := setupTestServer(t)
	defer ts.cleanup(t)

	req := map[string]interface{}{
		"application_id":  ts.appID,
		"organization_id": ts.orgID,
		"event_type":      "user.created",
		"payload": map[string]interface{}{
			"user_id": "123",
		},
	}

	rr := ts.request("POST", "/v1/events", req)

	if rr.Code != http.StatusCreated {
		t.Errorf("expected status 201, got %d: %s", rr.Code, rr.Body.String())
	}

	var resp map[string]interface{}
	if err := json.NewDecoder(rr.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	deliveryIDs, ok := resp["delivery_ids"].([]interface{})
	if !ok {
		t.Fatal("response missing delivery_ids array")
	}

	if len(deliveryIDs) != 0 {
		t.Errorf("expected 0 deliveries (no matching endpoints), got %d", len(deliveryIDs))
	}

	if len(ts.publisher.messages) != 0 {
		t.Errorf("expected 0 messages published (no endpoints), got %d", len(ts.publisher.messages))
	}
}
