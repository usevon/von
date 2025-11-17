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

func TestCreateEndpointValidation(t *testing.T) {
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
				"url": "https://example.com/webhook",
			},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name: "missing url",
			req: map[string]interface{}{
				"application_id": ts.appID,
			},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name: "invalid url",
			req: map[string]interface{}{
				"application_id": ts.appID,
				"url":            "not-a-url",
			},
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rr := ts.request("POST", "/v1/endpoints", tt.req)
			if rr.Code != tt.expectedStatus {
				t.Errorf("expected status %d, got %d: %s", tt.expectedStatus, rr.Code, rr.Body.String())
			}
		})
	}
}

func TestListEndpoints(t *testing.T) {
	ts := setupTestServer(t)
	defer ts.cleanup(t)

	endpoint1 := util.NewTestEndpoint(
		util.WithApplicationID(ts.appID),
		util.WithURL("https://example.com/webhook1"),
		util.WithDescription("Endpoint 1"),
		util.WithSecrets(types.JSONB{"current": "secret1"}),
		util.WithFilterMode(types.FilterModeAllow),
	)
	if err := ts.db.Create(&endpoint1).Error; err != nil {
		t.Fatalf("failed to create endpoint: %v", err)
	}

	endpoint2 := util.NewTestEndpoint(
		util.WithApplicationID(ts.appID),
		util.WithURL("https://example.com/webhook2"),
		util.WithDescription("Endpoint 2"),
		util.WithSecrets(types.JSONB{"current": "secret2"}),
		util.WithFilterMode(types.FilterModeBlock),
	)
	if err := ts.db.Create(&endpoint2).Error; err != nil {
		t.Fatalf("failed to create endpoint: %v", err)
	}

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
		util.WithDescription("Test endpoint"),
		util.WithSecret("test-secret"),
		util.WithFilterMode(types.FilterModeAllow),
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

	if resp["url"] != endpoint.URL {
		t.Errorf("expected url %s, got %v", endpoint.URL, resp["url"])
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
		util.WithDescription("Test endpoint"),
		util.WithSecret("test-secret"),
		util.WithFilterMode(types.FilterModeAllow),
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

	if resp["description"] != "Updated endpoint" {
		t.Errorf("expected updated description, got %v", resp["description"])
	}
}

func TestDeleteEndpoint(t *testing.T) {
	ts := setupTestServer(t)
	defer ts.cleanup(t)

	endpoint := util.NewTestEndpoint(
		util.WithApplicationID(ts.appID),
		util.WithURL("https://example.com/webhook"),
		util.WithDescription("Test endpoint"),
		util.WithSecret("test-secret"),
		util.WithFilterMode(types.FilterModeAllow),
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
