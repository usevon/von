package types

import "time"

// Application represents a top-level container for webhook endpoints within an organization.
// Each application has its own UID, rate limits, and metadata.
type Application struct {
	ID             string    `gorm:"type:uuid;primaryKey"`
	OrganizationID string    `gorm:"type:uuid;index;not null"`
	Name           string    `gorm:"not null"`
	UID            string    `gorm:"uniqueIndex;not null"`
	Description    string
	RateLimitRPS   *int
	Metadata       JSONB     `gorm:"type:jsonb"`
	Archived       bool      `gorm:"default:false"`
	CreatedAt      time.Time
	UpdatedAt      time.Time

	Endpoints []Endpoint `gorm:"foreignKey:ApplicationID"`
}

// TableName returns the database table name for Application.
func (Application) TableName() string {
	return "application"
}

// Endpoint represents a webhook destination URL with circuit breaking, secrets, and event filtering.
// Each endpoint belongs to an application and tracks health metrics to auto-disable failing destinations.
type Endpoint struct {
	ID            string    `gorm:"type:uuid;primaryKey"`
	ApplicationID string    `gorm:"type:uuid;index;not null"`
	UID           string    `gorm:"uniqueIndex;not null"`
	URL           string    `gorm:"not null"`
	Description   string

	Secrets     JSONB         `gorm:"type:jsonb"`
	SigningAlgo SignatureAlgo `gorm:"default:'sha256'"`

	EventFilters JSONB      `gorm:"type:jsonb"`
	FilterMode   FilterMode `gorm:"default:'allow'"`

	Status           EndpointStatus `gorm:"default:'healthy';index"`
	HealthScore      int            `gorm:"default:100"`
	ConsecutiveFails int            `gorm:"default:0"`
	LastSuccessAt    *time.Time
	LastFailureAt    *time.Time
	DisabledAt       *time.Time
	DisabledReason   string

	AutoRecovery  bool `gorm:"default:true"`
	RecoveryDelay int  `gorm:"default:3600"`

	RateLimitRPS   *int
	CustomHeaders  JSONB `gorm:"type:jsonb"`
	TimeoutSeconds int   `gorm:"default:30"`

	RetryStrategy RetryStrategy `gorm:"default:'exponential'"`
	MaxRetries    int           `gorm:"default:5"`
	RetryDelays   JSONB         `gorm:"type:jsonb"`

	Tags     JSONB     `gorm:"type:jsonb"`
	Metadata JSONB     `gorm:"type:jsonb"`

	CreatedAt time.Time
	UpdatedAt time.Time

	Application Application `gorm:"foreignKey:ApplicationID;constraint:OnDelete:CASCADE"`
}

// TableName returns the database table name for Endpoint.
func (Endpoint) TableName() string {
	return "endpoint"
}

// Event represents a webhook message with idempotency support and delivery tracking.
// Events can be delivered synchronously or asynchronously based on the delivery mode.
type Event struct {
	ID             string     `gorm:"type:uuid;primaryKey"`
	ApplicationID  string     `gorm:"type:uuid;index;not null"`
	OrganizationID string     `gorm:"type:uuid;index;not null"`

	IdempotencyKey *string `gorm:"uniqueIndex:idx_org_idempotency"`

	EventType    string `gorm:"index;not null"`
	EventVersion string `gorm:"default:'1'"`
	Payload      JSONB  `gorm:"type:jsonb;not null"`
	PayloadSize  int

	DeliveryMode DeliveryMode `gorm:"default:'async';index"`

	SourceAPIKeyID *string `gorm:"type:uuid"`
	SourceIP       string

	Tags     JSONB `gorm:"type:jsonb"`
	Metadata JSONB `gorm:"type:jsonb"`

	ExpiresAt time.Time  `gorm:"index"`
	DeletedAt *time.Time `gorm:"index"`
	CreatedAt time.Time  `gorm:"index"`

	Deliveries []EventDelivery `gorm:"foreignKey:EventID"`
}

// TableName returns the database table name for Event.
func (Event) TableName() string {
	return "event"
}

// EventDelivery represents a scheduled delivery of an event to a specific endpoint.
// Tracks retry scheduling, status transitions, and latency metrics for each delivery.
type EventDelivery struct {
	ID         string     `gorm:"type:uuid;primaryKey"`
	EventID    string     `gorm:"type:uuid;index;not null"`
	EndpointID string     `gorm:"type:uuid;index;not null"`

	Status DeliveryStatus `gorm:"index;not null"`

	NextAttemptAt *time.Time `gorm:"index"`
	AttemptCount  int        `gorm:"default:0"`
	MaxAttempts   int        `gorm:"not null"`

	LastStatusCode      *int
	LastResponsePreview string
	LastError           string
	LastAttemptAt       *time.Time

	DeliveredAt *time.Time
	FailedAt    *time.Time
	CancelledAt *time.Time

	TotalLatencyMS int

	CreatedAt time.Time
	UpdatedAt time.Time

	Attempts []DeliveryAttempt `gorm:"foreignKey:DeliveryID"`
}

// TableName returns the database table name for EventDelivery.
func (EventDelivery) TableName() string {
	return "event_delivery"
}

// DeliveryAttempt represents a single HTTP request attempt for a webhook delivery.
// Stores complete request/response details including headers, body, signatures, and timing.
type DeliveryAttempt struct {
	ID         string     `gorm:"type:uuid;primaryKey"`
	DeliveryID string     `gorm:"type:uuid;index;not null"`

	AttemptNumber int `gorm:"not null"`

	RequestURL      string `gorm:"not null"`
	RequestHeaders  JSONB  `gorm:"type:jsonb"`
	RequestBody     string
	Signature       string
	SignatureHeader string

	StatusCode      int
	ResponseHeaders JSONB `gorm:"type:jsonb"`
	ResponseBody    string

	LatencyMS   int       `gorm:"not null"`
	StartedAt   time.Time `gorm:"not null"`
	CompletedAt *time.Time

	Error     string
	ErrorCode string
	Retryable bool

	DeliveryMode DeliveryMode `gorm:"not null"`
	CreatedAt    time.Time
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
