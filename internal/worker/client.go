package worker

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/usevon/von/internal/util"
	"github.com/usevon/von/pkg/crypto"
	"github.com/usevon/von/pkg/types"
)

// DeliveryResult represents the result of a webhook HTTP delivery attempt.
type DeliveryResult struct {
	StatusCode      int
	ResponseHeaders map[string]string
	ResponseBody    string
	LatencyMS       int
	Error           string
	ErrorCode       string
	Retryable       bool
}

// IsSuccessful returns true if the delivery result indicates a successful delivery.
// Success is defined as HTTP 2xx status code with no error.
func (r DeliveryResult) IsSuccessful() bool {
	return r.StatusCode >= 200 && r.StatusCode < 300 && r.Error == ""
}

// IsRetryable returns true if the delivery result indicates a retryable failure.
func (r DeliveryResult) IsRetryableFailure() bool {
	return r.Retryable && !r.IsSuccessful()
}

// Client handles HTTP requests for webhook deliveries.
type Client struct {
	httpClient *http.Client
}

// NewClient creates a new webhook HTTP client with configurable timeout and connection pooling.
func NewClient(timeout time.Duration) *Client {
	transport := &http.Transport{
		MaxIdleConns:        100,
		MaxIdleConnsPerHost: 10,
		MaxConnsPerHost:     100,
		IdleConnTimeout:     90 * time.Second,
	}

	return &Client{
		httpClient: &http.Client{
			Timeout:   timeout,
			Transport: transport,
			CheckRedirect: func(req *http.Request, via []*http.Request) error {
				return http.ErrUseLastResponse
			},
		},
	}
}

// DeliverWebhook sends a webhook HTTP request and returns the complete delivery result.
func (c *Client) DeliverWebhook(ctx context.Context, msg types.QueueMessage) DeliveryResult {
	startTime := time.Now()
	errorResult := func(err string, code string, retryable bool) DeliveryResult {
		return DeliveryResult{Error: err, ErrorCode: code, Retryable: retryable, LatencyMS: int(time.Since(startTime).Milliseconds())}
	}

	payload, err := json.Marshal(msg.Payload)
	if err != nil {
		return errorResult(fmt.Sprintf("failed to marshal payload: %v", err), "marshal_error", false)
	}

	signature, err := crypto.GenerateSignature(payload, msg.Secret, types.SignatureAlgoSHA256)
	if err != nil {
		return errorResult(fmt.Sprintf("failed to generate signature: %v", err), "signature_error", false)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", msg.URL, bytes.NewReader(payload))
	if err != nil {
		return errorResult(fmt.Sprintf("failed to create request: %v", err), "request_error", false)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("User-Agent", "Von-Webhooks/1.0")
	req.Header.Set("X-Von-Signature", signature)
	req.Header.Set("X-Von-Event-Type", msg.EventType)
	req.Header.Set("X-Von-Event-ID", msg.EventID)
	req.Header.Set("X-Von-Delivery-ID", msg.DeliveryID)
	req.Header.Set("X-Von-Attempt", fmt.Sprintf("%d", msg.AttemptNumber))
	for key, value := range msg.Headers {
		req.Header.Set(key, value)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return errorResult(fmt.Sprintf("request failed: %v", err), "network_error", true)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(io.LimitReader(resp.Body, 10*1024))
	result := DeliveryResult{
		StatusCode:      resp.StatusCode,
		ResponseHeaders: util.HTTPHeadersToMap(resp.Header),
		ResponseBody:    string(body),
		LatencyMS:       int(time.Since(startTime).Milliseconds()),
	}

	switch {
	case resp.StatusCode >= 500:
		result.Error, result.ErrorCode, result.Retryable = fmt.Sprintf("server error: %d", resp.StatusCode), "server_error", true
	case resp.StatusCode == 429:
		result.Error, result.ErrorCode, result.Retryable = "rate limited", "rate_limit", true
	case resp.StatusCode >= 400:
		result.Error, result.ErrorCode, result.Retryable = fmt.Sprintf("client error: %d", resp.StatusCode), "client_error", false
	}

	return result
}
