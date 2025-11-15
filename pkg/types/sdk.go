package types

type SendRequest struct {
	To             string                 `json:"to"`
	Event          string                 `json:"event"`
	Data           map[string]interface{} `json:"data"`
	Headers        map[string]string      `json:"headers,omitempty"`
	IdempotencyKey *string                `json:"idempotency_key,omitempty"`
}

type SendResponse struct {
	MessageID  string `json:"message_id"`
	DeliveryID string `json:"delivery_id"`
	QueuedAt   int64  `json:"queued_at"`
}

type RequestRequest struct {
	To             string                 `json:"to"`
	Event          string                 `json:"event"`
	Data           map[string]interface{} `json:"data"`
	Headers        map[string]string      `json:"headers,omitempty"`
	Timeout        int                    `json:"timeout"`
	IdempotencyKey *string                `json:"idempotency_key,omitempty"`
}

type RequestResponse struct {
	StatusCode int                    `json:"status_code"`
	Headers    map[string]string      `json:"headers"`
	Body       interface{}            `json:"body"`
	LatencyMS  int                    `json:"latency_ms"`
	Error      string                 `json:"error,omitempty"`
}
