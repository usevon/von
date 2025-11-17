package api_test

import (
	"encoding/json"
	"net/http"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/usevon/von/pkg/types"
	"github.com/usevon/von/tests/util"
)

func TestListDeliveries(t *testing.T) {
	ts := setupTestServer(t)
	defer ts.cleanup(t)

	endpoint := util.NewTestEndpoint(
		util.WithApplicationID(ts.appID),
		util.WithURL("https://example.com/webhook"),
		util.WithSecret("secret"),
	)
	util.Must(t, ts.db.Create(&endpoint))

	event := util.NewTestEvent(
		util.WithEventApplicationID(ts.appID),
		util.WithEventOrganizationID(ts.orgID),
	)
	util.Must(t, ts.db.Create(&event))

	delivery1 := util.NewTestDelivery(
		util.WithEventIDForDelivery(event.ID),
		util.WithEndpointIDForDelivery(endpoint.ID),
	)
	util.Must(t, ts.db.Create(&delivery1))

	delivery2 := util.NewTestDelivery(
		util.WithEventIDForDelivery(event.ID),
		util.WithEndpointIDForDelivery(endpoint.ID),
		util.WithDeliveryStatus(types.DeliveryStatusDelivered),
	)
	util.Must(t, ts.db.Create(&delivery2))

	rr := ts.request("GET", "/v1/deliveries?application_id="+ts.appID, nil)

	if rr.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d: %s", rr.Code, rr.Body.String())
	}

	var resp map[string]interface{}
	if err := json.NewDecoder(rr.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	deliveries, ok := resp["deliveries"].([]interface{})
	if !ok {
		t.Fatal("response missing deliveries array")
	}

	if len(deliveries) != 2 {
		t.Errorf("expected 2 deliveries, got %d", len(deliveries))
	}
}

func TestListDeliveriesWithStatusFilter(t *testing.T) {
	ts := setupTestServer(t)
	defer ts.cleanup(t)

	endpoint := util.NewTestEndpoint(
		util.WithApplicationID(ts.appID),
		util.WithURL("https://example.com/webhook"),
		util.WithSecret("secret"),
	)
	util.Must(t, ts.db.Create(&endpoint))

	event := util.NewTestEvent(
		util.WithEventApplicationID(ts.appID),
		util.WithEventOrganizationID(ts.orgID),
	)
	util.Must(t, ts.db.Create(&event))

	deliveryPending := util.NewTestDelivery(
		util.WithEventIDForDelivery(event.ID),
		util.WithEndpointIDForDelivery(endpoint.ID),
		util.WithDeliveryStatus(types.DeliveryStatusQueued),
	)
	if err := ts.db.Create(&deliveryPending).Error; err != nil {
		t.Fatalf("failed to create pending delivery: %v", err)
	}

	deliverySuccess := util.NewTestDelivery(
		util.WithEventIDForDelivery(event.ID),
		util.WithEndpointIDForDelivery(endpoint.ID),
		util.WithDeliveryStatus(types.DeliveryStatusDelivered),
	)
	if err := ts.db.Create(&deliverySuccess).Error; err != nil {
		t.Fatalf("failed to create success delivery: %v", err)
	}

	rr := ts.request("GET", "/v1/deliveries?application_id="+ts.appID+"&status=queued", nil)

	if rr.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d: %s", rr.Code, rr.Body.String())
	}

	var resp map[string]interface{}
	if err := json.NewDecoder(rr.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	deliveries, ok := resp["deliveries"].([]interface{})
	if !ok {
		t.Fatal("response missing deliveries array")
	}

	if len(deliveries) != 1 {
		t.Errorf("expected 1 pending delivery, got %d", len(deliveries))
	}

	delivery := deliveries[0].(map[string]interface{})
	if delivery["status"] != "queued" {
		t.Errorf("expected status 'queued', got %v", delivery["status"])
	}
}

func TestGetDelivery(t *testing.T) {
	ts := setupTestServer(t)
	defer ts.cleanup(t)

	endpoint := util.NewTestEndpoint(
		util.WithApplicationID(ts.appID),
		util.WithURL("https://example.com/webhook"),
		util.WithSecret("secret"),
	)
	util.Must(t, ts.db.Create(&endpoint))

	event := util.NewTestEvent(
		util.WithEventApplicationID(ts.appID),
		util.WithEventOrganizationID(ts.orgID),
	)
	util.Must(t, ts.db.Create(&event))

	delivery := util.NewTestDelivery(
		util.WithEventIDForDelivery(event.ID),
		util.WithEndpointIDForDelivery(endpoint.ID),
		util.WithDeliveryStatus(types.DeliveryStatusDelivered),
	)
	if err := ts.db.Create(&delivery).Error; err != nil {
		t.Fatalf("failed to create delivery: %v", err)
	}

	rr := ts.request("GET", "/v1/deliveries/"+delivery.ID, nil)

	if rr.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d: %s", rr.Code, rr.Body.String())
	}

	var resp map[string]interface{}
	if err := json.NewDecoder(rr.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if resp["id"] != delivery.ID {
		t.Errorf("expected id %s, got %v", delivery.ID, resp["id"])
	}

	if resp["status"] != string(types.DeliveryStatusDelivered) {
		t.Errorf("expected status 'delivered', got %v", resp["status"])
	}
}

func TestGetDeliveryNotFound(t *testing.T) {
	ts := setupTestServer(t)
	defer ts.cleanup(t)

	rr := ts.request("GET", "/v1/deliveries/nonexistent-id", nil)

	if rr.Code != http.StatusNotFound {
		t.Errorf("expected status 404, got %d: %s", rr.Code, rr.Body.String())
	}
}

func TestGetDeliveryAttempts(t *testing.T) {
	ts := setupTestServer(t)
	defer ts.cleanup(t)

	endpoint := util.NewTestEndpoint(
		util.WithApplicationID(ts.appID),
		util.WithURL("https://example.com/webhook"),
		util.WithSecret("secret"),
	)
	util.Must(t, ts.db.Create(&endpoint))

	event := util.NewTestEvent(
		util.WithEventApplicationID(ts.appID),
		util.WithEventOrganizationID(ts.orgID),
	)
	util.Must(t, ts.db.Create(&event))

	delivery := util.NewTestDelivery(
		util.WithEventIDForDelivery(event.ID),
		util.WithEndpointIDForDelivery(endpoint.ID),
		util.WithDeliveryStatus(types.DeliveryStatusFailed),
	)
	if err := ts.db.Create(&delivery).Error; err != nil {
		t.Fatalf("failed to create delivery: %v", err)
	}

	attempt1 := types.DeliveryAttempt{
		ID:            uuid.New().String(),
		DeliveryID:    delivery.ID,
		AttemptNumber: 1,
		RequestURL:    "https://example.com/webhook",
		StatusCode:    500,
		Error:         "Internal Server Error",
		LatencyMS:     100,
		StartedAt:     time.Now(),
		DeliveryMode:  types.DeliveryModeAsync,
		CreatedAt:     time.Now(),
	}
	if err := ts.db.Create(&attempt1).Error; err != nil {
		t.Fatalf("failed to create attempt 1: %v", err)
	}

	attempt2 := types.DeliveryAttempt{
		ID:            uuid.New().String(),
		DeliveryID:    delivery.ID,
		AttemptNumber: 2,
		RequestURL:    "https://example.com/webhook",
		StatusCode:    503,
		Error:         "Service Unavailable",
		LatencyMS:     150,
		StartedAt:     time.Now(),
		DeliveryMode:  types.DeliveryModeAsync,
		CreatedAt:     time.Now(),
	}
	if err := ts.db.Create(&attempt2).Error; err != nil {
		t.Fatalf("failed to create attempt 2: %v", err)
	}

	rr := ts.request("GET", "/v1/deliveries/"+delivery.ID+"/attempts", nil)

	if rr.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d: %s", rr.Code, rr.Body.String())
	}

	var resp map[string]interface{}
	if err := json.NewDecoder(rr.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	attempts, ok := resp["attempts"].([]interface{})
	if !ok {
		t.Fatal("response missing attempts array")
	}

	if len(attempts) != 2 {
		t.Errorf("expected 2 attempts, got %d", len(attempts))
	}
}

func TestRetryDelivery(t *testing.T) {
	ts := setupTestServer(t)
	defer ts.cleanup(t)

	endpoint := util.NewTestEndpoint(
		util.WithApplicationID(ts.appID),
		util.WithURL("https://example.com/webhook"),
		util.WithSecret("secret"),
	)
	util.Must(t, ts.db.Create(&endpoint))

	event := util.NewTestEvent(
		util.WithEventApplicationID(ts.appID),
		util.WithEventOrganizationID(ts.orgID),
	)
	util.Must(t, ts.db.Create(&event))

	delivery := util.NewTestDelivery(
		util.WithEventIDForDelivery(event.ID),
		util.WithEndpointIDForDelivery(endpoint.ID),
		util.WithDeliveryStatus(types.DeliveryStatusFailed),
	)
	if err := ts.db.Create(&delivery).Error; err != nil {
		t.Fatalf("failed to create delivery: %v", err)
	}

	rr := ts.request("POST", "/v1/deliveries/"+delivery.ID+"/retry", nil)

	if rr.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d: %s", rr.Code, rr.Body.String())
	}

	if len(ts.publisher.messages) != 1 {
		t.Errorf("expected 1 message published for retry, got %d", len(ts.publisher.messages))
	}

	msg := ts.publisher.messages[0]
	if msg.DeliveryID != delivery.ID {
		t.Errorf("expected delivery_id %s, got %s", delivery.ID, msg.DeliveryID)
	}
}

func TestRetryDeliveryNotFound(t *testing.T) {
	ts := setupTestServer(t)
	defer ts.cleanup(t)

	rr := ts.request("POST", "/v1/deliveries/nonexistent-id/retry", nil)

	if rr.Code != http.StatusNotFound {
		t.Errorf("expected status 404, got %d: %s", rr.Code, rr.Body.String())
	}
}
