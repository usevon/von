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
		func(opts *util.EndpointOptions) {
			opts.EventFilters = types.JSONB{"filters": []interface{}{"user.created"}}
			opts.FilterMode = types.FilterModeAllow
		},
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
}

func TestCreateEventIdempotency(t *testing.T) {
	ts := setupTestServer(t)
	defer ts.cleanup(t)

	endpoint := util.NewTestEndpoint(
		util.WithApplicationID(ts.appID),
		util.WithURL("https://example.com/webhook"),
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
}
