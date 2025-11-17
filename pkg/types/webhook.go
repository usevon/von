package types

import "time"

// Application represents a container for webhook endpoints within an organization with rate limits and metadata.
type Application struct {
	ID             string    `gorm:"type:uuid;primaryKey" json:"id"`
	OrganizationID string    `gorm:"type:uuid;index;not null" json:"organization_id"`
	Name           string    `gorm:"not null" json:"name"`
	UID            string    `gorm:"uniqueIndex;not null" json:"uid"`
	Description    string    `json:"description,omitempty"`
	RateLimitRPS   *int      `json:"rate_limit_rps,omitempty"`
	Metadata       JSONB     `gorm:"type:jsonb" json:"metadata,omitempty"`
	Archived       bool      `gorm:"default:false" json:"archived"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`

	Endpoints []Endpoint `gorm:"foreignKey:ApplicationID" json:"endpoints,omitempty"`
}

// TableName returns the database table name for Application.
func (Application) TableName() string {
	return "application"
}

// Endpoint represents a webhook destination URL with circuit breaking, secrets, filtering, and health tracking.
type Endpoint struct {
	ID            string    `gorm:"type:uuid;primaryKey" json:"id"`
	ApplicationID string    `gorm:"type:uuid;index;not null" json:"application_id"`
	UID           string    `gorm:"uniqueIndex;not null" json:"uid"`
	URL           string    `gorm:"not null" json:"url"`
	Description   string    `json:"description"`

	Secrets     JSONB         `gorm:"type:jsonb" json:"secrets,omitempty"`
	SigningAlgo SignatureAlgo `gorm:"default:'sha256'" json:"signing_algo"`

	EventFilters JSONB      `gorm:"type:jsonb" json:"event_filters,omitempty"`
	FilterMode   FilterMode `gorm:"default:'allow'" json:"filter_mode"`

	Status           EndpointStatus `gorm:"default:'healthy';index" json:"status"`
	HealthScore      int            `gorm:"default:100" json:"health_score"`
	ConsecutiveFails int            `gorm:"default:0" json:"consecutive_fails"`
	LastSuccessAt    *time.Time     `json:"last_success_at,omitempty"`
	LastFailureAt    *time.Time     `json:"last_failure_at,omitempty"`
	DisabledAt       *time.Time     `json:"disabled_at,omitempty"`
	DisabledReason   string         `json:"disabled_reason,omitempty"`

	AutoRecovery  bool `gorm:"default:true" json:"auto_recovery"`
	RecoveryDelay int  `gorm:"default:3600" json:"recovery_delay"`

	RateLimitRPS   *int  `json:"rate_limit_rps,omitempty"`
	CustomHeaders  JSONB `gorm:"type:jsonb" json:"custom_headers,omitempty"`
	TimeoutSeconds int   `gorm:"default:30" json:"timeout_seconds"`

	RetryStrategy RetryStrategy `gorm:"default:'exponential'" json:"retry_strategy"`
	MaxRetries    int           `gorm:"default:5" json:"max_retries"`
	RetryDelays   JSONB         `gorm:"type:jsonb" json:"retry_delays,omitempty"`

	Tags     JSONB     `gorm:"type:jsonb" json:"tags,omitempty"`
	Metadata JSONB     `gorm:"type:jsonb" json:"metadata,omitempty"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`

	Application Application `gorm:"foreignKey:ApplicationID;constraint:OnDelete:CASCADE" json:"-"`
}

// TableName returns the database table name for Endpoint.
func (Endpoint) TableName() string {
	return "endpoint"
}

// EndpointConfig represents the configuration for a webhook endpoint including URL, secrets, and headers.
type EndpointConfig struct {
	ID             string        `gorm:"type:uuid;primaryKey" json:"id"`
	ApplicationID  string        `gorm:"type:uuid;index;not null" json:"application_id"`
	UID            string        `gorm:"uniqueIndex;not null" json:"uid"`
	URL            string        `gorm:"not null" json:"url"`
	Description    string        `json:"description"`
	Secrets        JSONB         `gorm:"type:jsonb" json:"secrets,omitempty"`
	SigningAlgo    SignatureAlgo `gorm:"default:'sha256'" json:"signing_algo"`
	CustomHeaders  JSONB         `gorm:"type:jsonb" json:"custom_headers,omitempty"`
	TimeoutSeconds int           `gorm:"default:30" json:"timeout_seconds"`
	RateLimitRPS   *int          `json:"rate_limit_rps,omitempty"`
	Tags           JSONB         `gorm:"type:jsonb" json:"tags,omitempty"`
	Metadata       JSONB         `gorm:"type:jsonb" json:"metadata,omitempty"`
	CreatedAt      time.Time     `json:"created_at"`
	UpdatedAt      time.Time     `json:"updated_at"`
}

// TableName returns the database table name for EndpointConfig.
func (EndpointConfig) TableName() string {
	return "endpoint_config"
}

// EndpointHealth tracks health status and reliability metrics updated after each delivery attempt.
type EndpointHealth struct {
	EndpointID       string         `gorm:"type:uuid;primaryKey" json:"endpoint_id"`
	Status           EndpointStatus `gorm:"default:'healthy';index" json:"status"`
	HealthScore      int            `gorm:"default:100" json:"health_score"`
	ConsecutiveFails int            `gorm:"default:0" json:"consecutive_fails"`
	LastSuccessAt    *time.Time     `json:"last_success_at,omitempty"`
	LastFailureAt    *time.Time     `json:"last_failure_at,omitempty"`
	DisabledAt       *time.Time     `json:"disabled_at,omitempty"`
	DisabledReason   string         `json:"disabled_reason,omitempty"`
	UpdatedAt        time.Time      `json:"updated_at"`
}

// TableName returns the database table name for EndpointHealth.
func (EndpointHealth) TableName() string {
	return "endpoint_health"
}

// EndpointRetryPolicy defines retry behavior with exponential, linear, or constant backoff strategies.
type EndpointRetryPolicy struct {
	EndpointID    string        `gorm:"type:uuid;primaryKey" json:"endpoint_id"`
	Strategy      RetryStrategy `gorm:"default:'exponential'" json:"retry_strategy"`
	MaxRetries    int           `gorm:"default:5" json:"max_retries"`
	RetryDelays   JSONB         `gorm:"type:jsonb" json:"retry_delays,omitempty"`
	AutoRecovery  bool          `gorm:"default:true" json:"auto_recovery"`
	RecoveryDelay int           `gorm:"default:3600" json:"recovery_delay"`
	CreatedAt     time.Time     `json:"created_at"`
	UpdatedAt     time.Time     `json:"updated_at"`
}

// TableName returns the database table name for EndpointRetryPolicy.
func (EndpointRetryPolicy) TableName() string {
	return "endpoint_retry_policy"
}

// EndpointEventFilter defines which event types an endpoint receives with allow or block mode.
type EndpointEventFilter struct {
	EndpointID   string     `gorm:"type:uuid;primaryKey" json:"endpoint_id"`
	EventFilters JSONB      `gorm:"type:jsonb" json:"event_filters,omitempty"`
	FilterMode   FilterMode `gorm:"default:'allow'" json:"filter_mode"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
}

// TableName returns the database table name for EndpointEventFilter.
func (EndpointEventFilter) TableName() string {
	return "endpoint_event_filter"
}

// Event represents a webhook message with idempotency support and delivery tracking.
// Events can be delivered synchronously or asynchronously based on the delivery mode.
type Event struct {
	ID             string     `gorm:"type:uuid;primaryKey" json:"id"`
	ApplicationID  string     `gorm:"type:uuid;index;index:idx_app_created;not null" json:"application_id"`
	OrganizationID string     `gorm:"type:uuid;index;index:idx_org_created;not null" json:"organization_id"`

	IdempotencyKey *string `gorm:"uniqueIndex:idx_org_idempotency" json:"idempotency_key,omitempty"`

	EventType    string `gorm:"index;not null" json:"event_type"`
	EventVersion string `gorm:"default:'1'" json:"event_version"`
	Payload      JSONB  `gorm:"type:jsonb;not null" json:"payload"`
	PayloadSize  int    `json:"payload_size"`

	DeliveryMode DeliveryMode `gorm:"default:'async';index" json:"delivery_mode"`

	SourceAPIKeyID *string `gorm:"type:uuid" json:"source_api_key_id,omitempty"`
	SourceIP       string  `json:"source_ip,omitempty"`

	Tags     JSONB `gorm:"type:jsonb" json:"tags,omitempty"`
	Metadata JSONB `gorm:"type:jsonb" json:"metadata,omitempty"`

	ExpiresAt time.Time  `gorm:"index" json:"expires_at"`
	DeletedAt *time.Time `gorm:"index" json:"deleted_at,omitempty"`
	CreatedAt time.Time  `gorm:"index;index:idx_app_created;index:idx_org_created" json:"created_at"`

	Deliveries []EventDelivery `gorm:"foreignKey:EventID" json:"deliveries,omitempty"`
}

// TableName returns the database table name for Event.
func (Event) TableName() string {
	return "event"
}

// EventDelivery represents a scheduled delivery of an event to a specific endpoint.
// Tracks retry scheduling, status transitions, and latency metrics for each delivery.
type EventDelivery struct {
	ID         string     `gorm:"type:uuid;primaryKey" json:"id"`
	EventID    string     `gorm:"type:uuid;index;not null" json:"event_id"`
	EndpointID string     `gorm:"type:uuid;index;index:idx_endpoint_status;not null" json:"endpoint_id"`

	Status DeliveryStatus `gorm:"index;index:idx_endpoint_status;not null" json:"status"`

	NextAttemptAt *time.Time `gorm:"index" json:"next_attempt_at,omitempty"`
	AttemptCount  int        `gorm:"default:0" json:"attempt_count"`
	MaxAttempts   int        `gorm:"not null" json:"max_attempts"`

	LastStatusCode      *int       `json:"last_status_code,omitempty"`
	LastResponsePreview string     `json:"last_response_preview,omitempty"`
	LastError           string     `json:"last_error,omitempty"`
	LastAttemptAt       *time.Time `json:"last_attempt_at,omitempty"`

	DeliveredAt *time.Time `json:"delivered_at,omitempty"`
	FailedAt    *time.Time `json:"failed_at,omitempty"`
	CancelledAt *time.Time `json:"cancelled_at,omitempty"`

	TotalLatencyMS int `json:"total_latency_ms"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`

	Attempts []DeliveryAttempt `gorm:"foreignKey:DeliveryID" json:"attempts,omitempty"`
}

// TableName returns the database table name for EventDelivery.
func (EventDelivery) TableName() string {
	return "event_delivery"
}

// DeliveryAttempt represents a single HTTP request attempt for a webhook delivery.
// Stores complete request/response details including headers, body, signatures, and timing.
type DeliveryAttempt struct {
	ID         string     `gorm:"type:uuid;primaryKey" json:"id"`
	DeliveryID string     `gorm:"type:uuid;index;index:idx_delivery_attempt;not null" json:"delivery_id"`

	AttemptNumber int `gorm:"index:idx_delivery_attempt;not null" json:"attempt_number"`

	RequestURL      string `gorm:"not null" json:"request_url"`
	RequestHeaders  JSONB  `gorm:"type:jsonb" json:"request_headers,omitempty"`
	RequestBody     string `json:"request_body,omitempty"`
	Signature       string `json:"signature,omitempty"`
	SignatureHeader string `json:"signature_header,omitempty"`

	StatusCode      int    `json:"status_code"`
	ResponseHeaders JSONB  `gorm:"type:jsonb" json:"response_headers,omitempty"`
	ResponseBody    string `json:"response_body,omitempty"`

	LatencyMS   int        `gorm:"not null" json:"latency_ms"`
	StartedAt   time.Time  `gorm:"not null" json:"started_at"`
	CompletedAt *time.Time `json:"completed_at,omitempty"`

	Error     string `json:"error,omitempty"`
	ErrorCode string `json:"error_code,omitempty"`
	Retryable bool   `json:"retryable"`

	DeliveryMode DeliveryMode `gorm:"not null" json:"delivery_mode"`
	CreatedAt    time.Time    `json:"created_at"`
}

// TableName returns the database table name for DeliveryAttempt.
func (DeliveryAttempt) TableName() string {
	return "delivery_attempt"
}

// EventSchema represents a versioned JSON schema definition for validating webhook event payloads.
// Provides schema registry functionality with examples and deprecation support.
type EventSchema struct {
	ID            string    `gorm:"type:uuid;primaryKey"`
	ApplicationID string    `gorm:"type:uuid;index;not null"`
	Name          string    `gorm:"index;not null"`
	Version       string    `gorm:"default:'1'"`
	Description   string
	JSONSchema    JSONB     `gorm:"type:jsonb"`
	Example       JSONB     `gorm:"type:jsonb"`
	Deprecated    bool      `gorm:"default:false"`
	CreatedAt     time.Time
	UpdatedAt     time.Time

	Application Application `gorm:"foreignKey:ApplicationID;constraint:OnDelete:CASCADE"`
}

// TableName returns the database table name for EventSchema.
func (EventSchema) TableName() string {
	return "event_schema"
}
