package types

import "time"

type SendWebhookRequest struct {
	To      string                 `json:"to"`
	Event   string                 `json:"event"`
	Data    map[string]interface{} `json:"data"`
	Headers map[string]string      `json:"headers,omitempty"`
}

type WebhookResult struct {
	Success    bool   `json:"success"`
	StatusCode int    `json:"statusCode"`
	Latency    int    `json:"latency"`
	Attempts   int    `json:"attempts"`
	Error      string `json:"error,omitempty"`
}

type WebhookLog struct {
	ID             string                 `json:"id"`
	Event          string                 `json:"event"`
	DestinationURL string                 `json:"destination_url"`
	Payload        map[string]interface{} `json:"payload"`
	StatusCode     int                    `json:"status_code"`
	Latency        int                    `json:"latency"`
	Attempts       int                    `json:"attempts"`
	Success        bool                   `json:"success"`
	Error          string                 `json:"error,omitempty"`
	CreatedAt      time.Time              `json:"created_at"`
	UpdatedAt      time.Time              `json:"updated_at"`
}

type WebhookEvent struct {
	ID          string                 `json:"id"`
	Source      string                 `json:"source"`
	Event       string                 `json:"event"`
	Data        map[string]interface{} `json:"data"`
	Signature   string                 `json:"signature,omitempty"`
	Verified    bool                   `json:"verified"`
	ProcessedAt *time.Time             `json:"processed_at,omitempty"`
	CreatedAt   time.Time              `json:"created_at"`
}
