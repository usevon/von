package worker

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

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

// Client handles HTTP requests for webhook deliveries.
type Client struct {
	httpClient *http.Client
}

// NewClient creates a new webhook HTTP client with configurable timeout.
func NewClient(timeout time.Duration) *Client {
	return &Client{
		httpClient: &http.Client{
			Timeout: timeout,
			CheckRedirect: func(req *http.Request, via []*http.Request) error {
				return http.ErrUseLastResponse
			},
		},
	}
}

// DeliverWebhook sends a webhook HTTP request and returns the complete delivery result.
func (c *Client) DeliverWebhook(ctx context.Context, msg types.QueueMessage) DeliveryResult {
	startTime := time.Now()

	payload, err := json.Marshal(msg.Payload)
	if err != nil {
		return DeliveryResult{
			Error:     fmt.Sprintf("failed to marshal payload: %v", err),
			ErrorCode: "marshal_error",
			Retryable: false,
			LatencyMS: int(time.Since(startTime).Milliseconds()),
		}
	}

	signature, err := crypto.GenerateSignature(payload, msg.Secret, types.SignatureAlgoSHA256)
	if err != nil {
		return DeliveryResult{
			Error:     fmt.Sprintf("failed to generate signature: %v", err),
			ErrorCode: "signature_error",
			Retryable: false,
			LatencyMS: int(time.Since(startTime).Milliseconds()),
		}
	}

	req, err := http.NewRequestWithContext(ctx, "POST", msg.URL, bytes.NewReader(payload))
	if err != nil {
		return DeliveryResult{
			Error:     fmt.Sprintf("failed to create request: %v", err),
			ErrorCode: "request_error",
			Retryable: false,
			LatencyMS: int(time.Since(startTime).Milliseconds()),
		}
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
		return DeliveryResult{
			Error:     fmt.Sprintf("request failed: %v", err),
			ErrorCode: "network_error",
			Retryable: true,
			LatencyMS: int(time.Since(startTime).Milliseconds()),
		}
	}
	defer resp.Body.Close()

	latencyMS := int(time.Since(startTime).Milliseconds())

	body, err := io.ReadAll(io.LimitReader(resp.Body, 10*1024))
	if err != nil {
		return DeliveryResult{
			StatusCode: resp.StatusCode,
			Error:      fmt.Sprintf("failed to read response body: %v", err),
			ErrorCode:  "read_error",
			Retryable:  false,
			LatencyMS:  latencyMS,
		}
	}

	headers := make(map[string]string)
	for key, values := range resp.Header {
		if len(values) > 0 {
			headers[key] = values[0]
		}
	}

	result := DeliveryResult{
		StatusCode:      resp.StatusCode,
		ResponseHeaders: headers,
		ResponseBody:    string(body),
		LatencyMS:       latencyMS,
	}

	if resp.StatusCode >= 500 {
		result.Error = fmt.Sprintf("server error: %d", resp.StatusCode)
		result.ErrorCode = "server_error"
		result.Retryable = true
	} else if resp.StatusCode == 429 {
		result.Error = "rate limited"
		result.ErrorCode = "rate_limit"
		result.Retryable = true
	} else if resp.StatusCode >= 400 {
		result.Error = fmt.Sprintf("client error: %d", resp.StatusCode)
		result.ErrorCode = "client_error"
		result.Retryable = false
	}

	return result
}
