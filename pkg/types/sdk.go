package types

// SendRequest represents an async webhook send request (fire-and-forget).
type SendRequest struct {
	To             string                 `json:"to"`
	Event          string                 `json:"event"`
	Data           map[string]interface{} `json:"data"`
	Headers        map[string]string      `json:"headers,omitempty"`
	IdempotencyKey *string                `json:"idempotency_key,omitempty"`
}

// SendResponse is returned immediately after queueing an async webhook.
type SendResponse struct {
	MessageID  string `json:"message_id"`
	DeliveryID string `json:"delivery_id"`
	QueuedAt   int64  `json:"queued_at"`
}

// RequestRequest represents a sync webhook request (request-response).
type RequestRequest struct {
	To             string                 `json:"to"`
	Event          string                 `json:"event"`
	Data           map[string]interface{} `json:"data"`
	Headers        map[string]string      `json:"headers,omitempty"`
	Timeout        int                    `json:"timeout"`
	IdempotencyKey *string                `json:"idempotency_key,omitempty"`
}

// RequestResponse is the full response from a sync webhook delivery.
type RequestResponse struct {
	StatusCode int                    `json:"status_code"`
	Headers    map[string]string      `json:"headers"`
	Body       interface{}            `json:"body"`
	LatencyMS  int                    `json:"latency_ms"`
	Error      string                 `json:"error,omitempty"`
}
