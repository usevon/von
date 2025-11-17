package api_test

import (
	"encoding/json"
	"net/http"
	"testing"

	"github.com/usevon/von/pkg/types"
	"github.com/usevon/von/tests/util"
)

func TestCreateEndpoint(t *testing.T) {
	ts := setupTestServer(t)
	defer ts.cleanup(t)

	req := map[string]interface{}{
		"application_id": ts.appID,
		"url":            "https://example.com/webhook",
		"description":    "Test endpoint",
		"secret":         "test-secret",
		"event_filters":  []string{"user.created", "user.updated"},
		"filter_mode":    "allow",
	}

	rr := ts.request("POST", "/v1/endpoints", req)

	if rr.Code != http.StatusCreated {
		t.Errorf("expected status 201, got %d: %s", rr.Code, rr.Body.String())
	}

	var resp map[string]interface{}
	if err := json.NewDecoder(rr.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if resp["id"] == nil {
		t.Error("response missing id field")
	}

	if resp["url"] != "https://example.com/webhook" {
		t.Errorf("expected url 'https://example.com/webhook', got %v", resp["url"])
	}
}

func TestListEndpoints(t *testing.T) {
	ts := setupTestServer(t)
	defer ts.cleanup(t)

	endpoint1 := util.NewTestEndpoint(
		util.WithApplicationID(ts.appID),
		util.WithURL("https://example.com/webhook1"),
	)
	util.Must(t, ts.db.Create(&endpoint1))

	endpoint2 := util.NewTestEndpoint(
		util.WithApplicationID(ts.appID),
		util.WithURL("https://example.com/webhook2"),
	)
	util.Must(t, ts.db.Create(&endpoint2))

	rr := ts.request("GET", "/v1/endpoints?application_id="+ts.appID, nil)

	if rr.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d: %s", rr.Code, rr.Body.String())
	}

	var resp map[string]interface{}
	if err := json.NewDecoder(rr.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	endpoints, ok := resp["endpoints"].([]interface{})
	if !ok {
		t.Fatal("response missing endpoints array")
	}

	if len(endpoints) != 2 {
		t.Errorf("expected 2 endpoints, got %d", len(endpoints))
	}
}

func TestGetEndpoint(t *testing.T) {
	ts := setupTestServer(t)
	defer ts.cleanup(t)

	endpoint := util.NewTestEndpoint(
		util.WithApplicationID(ts.appID),
		util.WithURL("https://example.com/webhook"),
	)
	util.Must(t, ts.db.Create(&endpoint))

	rr := ts.request("GET", "/v1/endpoints/"+endpoint.ID, nil)

	if rr.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d: %s", rr.Code, rr.Body.String())
	}

	var resp map[string]interface{}
	if err := json.NewDecoder(rr.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if resp["id"] != endpoint.ID {
		t.Errorf("expected id %s, got %v", endpoint.ID, resp["id"])
	}
}

func TestGetEndpointNotFound(t *testing.T) {
	ts := setupTestServer(t)
	defer ts.cleanup(t)

	rr := ts.request("GET", "/v1/endpoints/nonexistent-id", nil)

	if rr.Code != http.StatusNotFound {
		t.Errorf("expected status 404, got %d: %s", rr.Code, rr.Body.String())
	}
}

func TestUpdateEndpoint(t *testing.T) {
	ts := setupTestServer(t)
	defer ts.cleanup(t)

	endpoint := util.NewTestEndpoint(
		util.WithApplicationID(ts.appID),
		util.WithURL("https://example.com/webhook"),
	)
	util.Must(t, ts.db.Create(&endpoint))

	updateReq := map[string]interface{}{
		"url":         "https://example.com/new-webhook",
		"description": "Updated endpoint",
	}

	rr := ts.request("PUT", "/v1/endpoints/"+endpoint.ID, updateReq)

	if rr.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d: %s", rr.Code, rr.Body.String())
	}

	var resp map[string]interface{}
	if err := json.NewDecoder(rr.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if resp["url"] != "https://example.com/new-webhook" {
		t.Errorf("expected updated url, got %v", resp["url"])
	}
}

func TestDeleteEndpoint(t *testing.T) {
	ts := setupTestServer(t)
	defer ts.cleanup(t)

	endpoint := util.NewTestEndpoint(
		util.WithApplicationID(ts.appID),
		util.WithURL("https://example.com/webhook"),
	)
	util.Must(t, ts.db.Create(&endpoint))

	rr := ts.request("DELETE", "/v1/endpoints/"+endpoint.ID, nil)

	if rr.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d: %s", rr.Code, rr.Body.String())
	}

	var deletedEndpoint types.Endpoint
	err := ts.db.First(&deletedEndpoint, "id = ?", endpoint.ID).Error
	if err == nil {
		t.Error("endpoint should have been deleted")
	}
}
