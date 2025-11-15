package types

import "time"

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

func (Application) TableName() string {
	return "application"
}

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

func (Endpoint) TableName() string {
	return "endpoint"
}

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

func (Event) TableName() string {
	return "event"
}

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

func (EventDelivery) TableName() string {
	return "event_delivery"
}

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

func (DeliveryAttempt) TableName() string {
	return "delivery_attempt"
}

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

func (EventSchema) TableName() string {
	return "event_schema"
}
