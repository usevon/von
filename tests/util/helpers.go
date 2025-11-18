package util

import (
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/usevon/von/internal/db"
	"github.com/usevon/von/internal/queue"
	"github.com/usevon/von/pkg/types"
	"gorm.io/gorm"
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

// WithAppID sets the application ID
func WithAppID(id string) func(*ApplicationOptions) {
	return func(opts *ApplicationOptions) {
		opts.ID = id
	}
}

// WithOrganizationID sets the organization ID
func WithOrganizationID(orgID string) func(*ApplicationOptions) {
	return func(opts *ApplicationOptions) {
		opts.OrganizationID = orgID
	}
}

// WithEndpointID sets the endpoint ID
func WithEndpointID(id string) func(*EndpointOptions) {
	return func(opts *EndpointOptions) {
		opts.ID = id
	}
}

// WithApplicationID sets the application ID for an endpoint
func WithApplicationID(appID string) func(*EndpointOptions) {
	return func(opts *EndpointOptions) {
		opts.ApplicationID = appID
	}
}

// WithURL sets the endpoint URL
func WithURL(url string) func(*EndpointOptions) {
	return func(opts *EndpointOptions) {
		opts.URL = url
	}
}

// WithSecret sets the endpoint secret (current key)
func WithSecret(secret string) func(*EndpointOptions) {
	return func(opts *EndpointOptions) {
		opts.Secrets = types.JSONB{"current": secret}
	}
}

// WithSecrets sets custom endpoint secrets
func WithSecrets(secrets types.JSONB) func(*EndpointOptions) {
	return func(opts *EndpointOptions) {
		opts.Secrets = secrets
	}
}

// WithEventApplicationID sets the application ID for an event
func WithEventApplicationID(appID string) func(*EventOptions) {
	return func(opts *EventOptions) {
		opts.ApplicationID = appID
	}
}

// WithEventOrganizationID sets the organization ID for an event
func WithEventOrganizationID(orgID string) func(*EventOptions) {
	return func(opts *EventOptions) {
		opts.OrganizationID = orgID
	}
}

// WithDeliveryStatus sets the delivery status
func WithDeliveryStatus(status types.DeliveryStatus) func(*DeliveryOptions) {
	return func(opts *DeliveryOptions) {
		opts.Status = status
	}
}

// WithEventIDForDelivery sets the event ID for a delivery
func WithEventIDForDelivery(eventID string) func(*DeliveryOptions) {
	return func(opts *DeliveryOptions) {
		opts.EventID = eventID
	}
}

// WithEndpointIDForDelivery sets the endpoint ID for a delivery
func WithEndpointIDForDelivery(endpointID string) func(*DeliveryOptions) {
	return func(opts *DeliveryOptions) {
		opts.EndpointID = endpointID
	}
}

// SetupDatabase creates a database connection and runs migrations for tests.
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

// Must fails the test if the database operation returned an error.
func Must(t *testing.T, db *gorm.DB) {
	t.Helper()
	if db.Error != nil {
		t.Fatalf("database operation failed: %v", db.Error)
	}
}

// NewTestMessage creates a test QueueMessage with sensible defaults.
func NewTestMessage(opts ...func(*types.QueueMessage)) types.QueueMessage {
	msg := types.QueueMessage{
		DeliveryID:    uuid.New().String(),
		EventID:       uuid.New().String(),
		EndpointID:    uuid.New().String(),
		URL:           "https://example.com/webhook",
		EventType:     "test.event",
		Payload:       types.JSONB{"test": "data"},
		Headers:       map[string]string{},
		Secret:        "test-secret",
		AttemptNumber: 1,
		DeliveryMode:  types.DeliveryModeAsync,
		MaxRetries:    3,
		RetryStrategy: types.RetryStrategyExponential,
		EnqueuedAt:    time.Now(),
	}

	for _, opt := range opts {
		opt(&msg)
	}

	return msg
}

// WithPayload sets the payload for QueueMessage
func WithPayload(payload types.JSONB) func(*types.QueueMessage) {
	return func(m *types.QueueMessage) {
		m.Payload = payload
	}
}

// SetupQueue creates a test queue and handles cleanup.
func SetupQueue(t *testing.T) *queue.Queue {
	t.Helper()

	q, err := queue.NewQueue(GetRabbitMQURL())
	if err != nil {
		t.Fatalf("failed to create queue: %v", err)
	}

	t.Cleanup(func() {
		q.Close()
	})

	return q
}
