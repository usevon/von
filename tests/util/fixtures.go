package util

import (
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/usevon/von/internal/db"
	"github.com/usevon/von/pkg/types"
)

// ApplicationOptions holds configuration for creating a test application
type ApplicationOptions struct {
	ID             string
	OrganizationID string
	Name           string
	UID            string
	Description    string
	Archived       bool
}

// NewTestApplication creates a test application with sensible defaults.
// Use functional options to override defaults.
func NewTestApplication(opts ...func(*ApplicationOptions)) types.Application {
	options := &ApplicationOptions{
		ID:             uuid.New().String(),
		OrganizationID: uuid.New().String(),
		Name:           "Test Application",
		UID:            "app_" + uuid.New().String()[:8],
		Description:    "",
		Archived:       false,
	}

	for _, opt := range opts {
		opt(options)
	}

	now := time.Now()
	return types.Application{
		ID:             options.ID,
		OrganizationID: options.OrganizationID,
		Name:           options.Name,
		UID:            options.UID,
		Description:    options.Description,
		Archived:       options.Archived,
		CreatedAt:      now,
		UpdatedAt:      now,
	}
}

// EndpointOptions holds configuration for creating a test endpoint
type EndpointOptions struct {
	ID             string
	ApplicationID  string
	UID            string
	URL            string
	Description    string
	SigningAlgo    types.SignatureAlgo
	Secrets        types.JSONB
	EventFilters   types.JSONB
	Status         types.EndpointStatus
	HealthScore    int
	RetryStrategy  types.RetryStrategy
	MaxRetries     int
	TimeoutSeconds int
	FilterMode     types.FilterMode
}

// NewTestEndpoint creates a test endpoint with sensible defaults.
func NewTestEndpoint(opts ...func(*EndpointOptions)) types.Endpoint {
	options := &EndpointOptions{
		ID:             uuid.New().String(),
		ApplicationID:  uuid.New().String(),
		UID:            "ep_" + uuid.New().String()[:8],
		URL:            "https://example.com/webhook",
		SigningAlgo:    types.SignatureAlgoSHA256,
		Secrets:        types.JSONB{"current": "test-secret-key"},
		Status:         types.EndpointStatusHealthy,
		HealthScore:    100,
		RetryStrategy:  types.RetryStrategyExponential,
		MaxRetries:     3,
		TimeoutSeconds: 30,
		FilterMode:     types.FilterModeAllow,
	}

	for _, opt := range opts {
		opt(options)
	}

	now := time.Now()
	return types.Endpoint{
		ID:             options.ID,
		ApplicationID:  options.ApplicationID,
		UID:            options.UID,
		URL:            options.URL,
		Description:    options.Description,
		SigningAlgo:    options.SigningAlgo,
		Secrets:        options.Secrets,
		EventFilters:   options.EventFilters,
		Status:         options.Status,
		HealthScore:    options.HealthScore,
		RetryStrategy:  options.RetryStrategy,
		MaxRetries:     options.MaxRetries,
		TimeoutSeconds: options.TimeoutSeconds,
		FilterMode:     options.FilterMode,
		CreatedAt:      now,
		UpdatedAt:      now,
	}
}

// EventOptions holds configuration for creating a test event
type EventOptions struct {
	ID             string
	ApplicationID  string
	OrganizationID string
	EventType      string
	EventVersion   string
	Payload        types.JSONB
	PayloadSize    int
	DeliveryMode   types.DeliveryMode
}

// NewTestEvent creates a test event with sensible defaults.
func NewTestEvent(opts ...func(*EventOptions)) types.Event {
	options := &EventOptions{
		ID:             uuid.New().String(),
		ApplicationID:  uuid.New().String(),
		OrganizationID: uuid.New().String(),
		EventType:      "test.event",
		EventVersion:   "1",
		Payload: types.JSONB{
			"test": "data",
		},
		PayloadSize:  100,
		DeliveryMode: types.DeliveryModeAsync,
	}

	for _, opt := range opts {
		opt(options)
	}

	return types.Event{
		ID:             options.ID,
		ApplicationID:  options.ApplicationID,
		OrganizationID: options.OrganizationID,
		EventType:      options.EventType,
		EventVersion:   options.EventVersion,
		Payload:        options.Payload,
		PayloadSize:    options.PayloadSize,
		DeliveryMode:   options.DeliveryMode,
		CreatedAt:      time.Now(),
	}
}

// DeliveryOptions holds configuration for creating a test delivery
type DeliveryOptions struct {
	ID           string
	EventID      string
	EndpointID   string
	Status       types.DeliveryStatus
	AttemptCount int
	MaxAttempts  int
}

// NewTestDelivery creates a test event delivery with sensible defaults.
func NewTestDelivery(opts ...func(*DeliveryOptions)) types.EventDelivery {
	options := &DeliveryOptions{
		ID:           uuid.New().String(),
		EventID:      uuid.New().String(),
		EndpointID:   uuid.New().String(),
		Status:       types.DeliveryStatusQueued,
		AttemptCount: 0,
		MaxAttempts:  3,
	}

	for _, opt := range opts {
		opt(options)
	}

	now := time.Now()
	return types.EventDelivery{
		ID:           options.ID,
		EventID:      options.EventID,
		EndpointID:   options.EndpointID,
		Status:       options.Status,
		AttemptCount: options.AttemptCount,
		MaxAttempts:  options.MaxAttempts,
		CreatedAt:    now,
		UpdatedAt:    now,
	}
}

// SetupDatabase creates a database connection and runs migrations for tests.
// Automatically cleans up on test completion.
func SetupDatabase(t *testing.T) *db.DB {
	t.Helper()

	database, err := db.New(GetPostgresURL())
	if err != nil {
		t.Fatalf("failed to connect to database: %v", err)
	}

	if err := database.AutoMigrate(); err != nil {
		t.Fatalf("failed to run migrations: %v", err)
	}

	t.Cleanup(func() {
		sqlDB, _ := database.DB.DB()
		if sqlDB != nil {
			sqlDB.Close()
		}
	})

	return database
}
