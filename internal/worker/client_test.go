package worker

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/usevon/von/pkg/types"
)

func TestDeliveryResult_IsSuccessful(t *testing.T) {
	tests := []struct {
		name       string
		result     DeliveryResult
		successful bool
	}{
		{
			name: "200 OK with no error",
			result: DeliveryResult{
				StatusCode: 200,
				Error:      "",
			},
			successful: true,
		},
		{
			name: "201 Created with no error",
			result: DeliveryResult{
				StatusCode: 201,
				Error:      "",
			},
			successful: true,
		},
		{
			name: "299 with no error",
			result: DeliveryResult{
				StatusCode: 299,
				Error:      "",
			},
			successful: true,
		},
		{
			name: "200 OK but has error",
			result: DeliveryResult{
				StatusCode: 200,
				Error:      "some error",
			},
			successful: false,
		},
		{
			name: "400 Bad Request",
			result: DeliveryResult{
				StatusCode: 400,
				Error:      "client error: 400",
			},
			successful: false,
		},
		{
			name: "500 Server Error",
			result: DeliveryResult{
				StatusCode: 500,
				Error:      "server error: 500",
			},
			successful: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := tt.result.IsSuccessful(); got != tt.successful {
				t.Errorf("IsSuccessful() = %v, expected %v", got, tt.successful)
			}
		})
	}
}

func TestDeliveryResult_IsRetryableFailure(t *testing.T) {
	tests := []struct {
		name      string
		result    DeliveryResult
		retryable bool
	}{
		{
			name: "500 server error - retryable",
			result: DeliveryResult{
				StatusCode: 500,
				Error:      "server error: 500",
				Retryable:  true,
			},
			retryable: true,
		},
		{
			name: "429 rate limit - retryable",
			result: DeliveryResult{
				StatusCode: 429,
				Error:      "rate limited",
				Retryable:  true,
			},
			retryable: true,
		},
		{
			name: "network error - retryable",
			result: DeliveryResult{
				Error:     "network_error",
				Retryable: true,
			},
			retryable: true,
		},
		{
			name: "400 client error - not retryable",
			result: DeliveryResult{
				StatusCode: 400,
				Error:      "client error: 400",
				Retryable:  false,
			},
			retryable: false,
		},
		{
			name: "200 success - not retryable failure",
			result: DeliveryResult{
				StatusCode: 200,
				Retryable:  true,
			},
			retryable: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := tt.result.IsRetryableFailure(); got != tt.retryable {
				t.Errorf("IsRetryableFailure() = %v, expected %v", got, tt.retryable)
			}
		})
	}
}

func TestClient_DeliverWebhook_Success(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "POST" {
			t.Errorf("expected POST method, got %s", r.Method)
		}

		if ct := r.Header.Get("Content-Type"); ct != "application/json" {
			t.Errorf("expected Content-Type application/json, got %s", ct)
		}

		if ua := r.Header.Get("User-Agent"); ua != "Von-Webhooks/1.0" {
			t.Errorf("expected User-Agent Von-Webhooks/1.0, got %s", ua)
		}

		if sig := r.Header.Get("X-Von-Signature"); sig == "" {
			t.Error("expected X-Von-Signature header to be set")
		}

		if et := r.Header.Get("X-Von-Event-Type"); et != "test.event" {
			t.Errorf("expected X-Von-Event-Type test.event, got %s", et)
		}

		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"received"}`))
	}))
	defer server.Close()

	client := NewClient(30 * time.Second)
	msg := types.QueueMessage{
		DeliveryID:    uuid.New().String(),
		EventID:       uuid.New().String(),
		EndpointID:    uuid.New().String(),
		URL:           server.URL,
		EventType:     "test.event",
		Payload:       types.JSONB{"test": "data"},
		Secret:        "test-secret",
		AttemptNumber: 1,
	}

	result := client.DeliverWebhook(context.Background(), msg)

	if !result.IsSuccessful() {
		t.Errorf("expected successful delivery, got error: %s", result.Error)
	}

	if result.StatusCode != 200 {
		t.Errorf("expected status code 200, got %d", result.StatusCode)
	}

	if result.ResponseBody != `{"status":"received"}` {
		t.Errorf("expected response body {\"status\":\"received\"}, got %s", result.ResponseBody)
	}

	if result.LatencyMS <= 0 {
		t.Error("expected latency to be greater than 0")
	}
}

func TestClient_DeliverWebhook_ServerError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte("Internal Server Error"))
	}))
	defer server.Close()

	client := NewClient(30 * time.Second)
	msg := types.QueueMessage{
		DeliveryID:    uuid.New().String(),
		EventID:       uuid.New().String(),
		EndpointID:    uuid.New().String(),
		URL:           server.URL,
		EventType:     "test.event",
		Payload:       types.JSONB{"test": "data"},
		Secret:        "test-secret",
		AttemptNumber: 1,
	}

	result := client.DeliverWebhook(context.Background(), msg)

	if result.IsSuccessful() {
		t.Error("expected delivery to fail")
	}

	if result.StatusCode != 500 {
		t.Errorf("expected status code 500, got %d", result.StatusCode)
	}

	if !result.Retryable {
		t.Error("expected server error to be retryable")
	}

	if result.ErrorCode != "server_error" {
		t.Errorf("expected error code server_error, got %s", result.ErrorCode)
	}
}

func TestClient_DeliverWebhook_RateLimited(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusTooManyRequests)
		w.Write([]byte("Rate limit exceeded"))
	}))
	defer server.Close()

	client := NewClient(30 * time.Second)
	msg := types.QueueMessage{
		DeliveryID:    uuid.New().String(),
		EventID:       uuid.New().String(),
		EndpointID:    uuid.New().String(),
		URL:           server.URL,
		EventType:     "test.event",
		Payload:       types.JSONB{"test": "data"},
		Secret:        "test-secret",
		AttemptNumber: 1,
	}

	result := client.DeliverWebhook(context.Background(), msg)

	if result.StatusCode != 429 {
		t.Errorf("expected status code 429, got %d", result.StatusCode)
	}

	if !result.Retryable {
		t.Error("expected rate limit to be retryable")
	}

	if result.ErrorCode != "rate_limit" {
		t.Errorf("expected error code rate_limit, got %s", result.ErrorCode)
	}
}

func TestClient_DeliverWebhook_ClientError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte("Bad Request"))
	}))
	defer server.Close()

	client := NewClient(30 * time.Second)
	msg := types.QueueMessage{
		DeliveryID:    uuid.New().String(),
		EventID:       uuid.New().String(),
		EndpointID:    uuid.New().String(),
		URL:           server.URL,
		EventType:     "test.event",
		Payload:       types.JSONB{"test": "data"},
		Secret:        "test-secret",
		AttemptNumber: 1,
	}

	result := client.DeliverWebhook(context.Background(), msg)

	if result.StatusCode != 400 {
		t.Errorf("expected status code 400, got %d", result.StatusCode)
	}

	if result.Retryable {
		t.Error("expected client error to not be retryable")
	}

	if result.ErrorCode != "client_error" {
		t.Errorf("expected error code client_error, got %s", result.ErrorCode)
	}
}

func TestClient_DeliverWebhook_CustomHeaders(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if auth := r.Header.Get("Authorization"); auth != "Bearer test-token" {
			t.Errorf("expected Authorization header, got %s", auth)
		}

		if custom := r.Header.Get("X-Custom-Header"); custom != "custom-value" {
			t.Errorf("expected X-Custom-Header, got %s", custom)
		}

		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	client := NewClient(30 * time.Second)
	msg := types.QueueMessage{
		DeliveryID:    uuid.New().String(),
		EventID:       uuid.New().String(),
		EndpointID:    uuid.New().String(),
		URL:           server.URL,
		EventType:     "test.event",
		Payload:       types.JSONB{"test": "data"},
		Secret:        "test-secret",
		AttemptNumber: 1,
		Headers: map[string]string{
			"Authorization":   "Bearer test-token",
			"X-Custom-Header": "custom-value",
		},
	}

	result := client.DeliverWebhook(context.Background(), msg)

	if !result.IsSuccessful() {
		t.Errorf("expected successful delivery, got error: %s", result.Error)
	}
}

func TestClient_DeliverWebhook_InvalidPayload(t *testing.T) {
	client := NewClient(30 * time.Second)

	invalidPayload := make(types.JSONB)
	invalidPayload["channel"] = make(chan int)

	msg := types.QueueMessage{
		DeliveryID:    uuid.New().String(),
		EventID:       uuid.New().String(),
		EndpointID:    uuid.New().String(),
		URL:           "http://example.com",
		EventType:     "test.event",
		Payload:       invalidPayload,
		Secret:        "test-secret",
		AttemptNumber: 1,
	}

	result := client.DeliverWebhook(context.Background(), msg)

	if result.IsSuccessful() {
		t.Error("expected delivery to fail with marshal error")
	}

	if result.ErrorCode != "marshal_error" {
		t.Errorf("expected error code marshal_error, got %s", result.ErrorCode)
	}

	if result.Retryable {
		t.Error("expected marshal error to not be retryable")
	}
}

func TestClient_DeliverWebhook_Timeout(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(200 * time.Millisecond)
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	client := NewClient(50 * time.Millisecond)
	msg := types.QueueMessage{
		DeliveryID:    uuid.New().String(),
		EventID:       uuid.New().String(),
		EndpointID:    uuid.New().String(),
		URL:           server.URL,
		EventType:     "test.event",
		Payload:       types.JSONB{"test": "data"},
		Secret:        "test-secret",
		AttemptNumber: 1,
	}

	result := client.DeliverWebhook(context.Background(), msg)

	if result.IsSuccessful() {
		t.Error("expected delivery to fail with timeout")
	}

	if result.ErrorCode != "network_error" {
		t.Errorf("expected error code network_error, got %s", result.ErrorCode)
	}

	if !result.Retryable {
		t.Error("expected timeout to be retryable")
	}
}

func TestClient_DeliverWebhook_ResponseBodyLimit(t *testing.T) {
	largeBody := make([]byte, 20*1024)
	for i := range largeBody {
		largeBody[i] = 'A'
	}

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write(largeBody)
	}))
	defer server.Close()

	client := NewClient(30 * time.Second)
	msg := types.QueueMessage{
		DeliveryID:    uuid.New().String(),
		EventID:       uuid.New().String(),
		EndpointID:    uuid.New().String(),
		URL:           server.URL,
		EventType:     "test.event",
		Payload:       types.JSONB{"test": "data"},
		Secret:        "test-secret",
		AttemptNumber: 1,
	}

	result := client.DeliverWebhook(context.Background(), msg)

	if len(result.ResponseBody) > 10*1024 {
		t.Errorf("expected response body to be limited to 10KB, got %d bytes", len(result.ResponseBody))
	}
}

func TestClient_DeliverWebhook_JSONMarshaling(t *testing.T) {
	var receivedPayload map[string]interface{}

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if err := json.NewDecoder(r.Body).Decode(&receivedPayload); err != nil {
			t.Errorf("failed to decode payload: %v", err)
		}
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	client := NewClient(30 * time.Second)
	msg := types.QueueMessage{
		DeliveryID:    uuid.New().String(),
		EventID:       uuid.New().String(),
		EndpointID:    uuid.New().String(),
		URL:           server.URL,
		EventType:     "test.event",
		Payload:       types.JSONB{"user": "john", "age": float64(30)},
		Secret:        "test-secret",
		AttemptNumber: 1,
	}

	result := client.DeliverWebhook(context.Background(), msg)

	if !result.IsSuccessful() {
		t.Errorf("expected successful delivery, got error: %s", result.Error)
	}

	if receivedPayload["user"] != "john" {
		t.Errorf("expected user john, got %v", receivedPayload["user"])
	}

	if receivedPayload["age"] != float64(30) {
		t.Errorf("expected age 30, got %v", receivedPayload["age"])
	}
}
