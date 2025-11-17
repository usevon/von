package util

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/usevon/von/internal/db"
	"github.com/usevon/von/internal/queue"
	"github.com/usevon/von/internal/worker"
	"github.com/usevon/von/pkg/types"
	"gorm.io/gorm"
)

// Must is a helper that fails the test if the database operation returned an error.
func Must(t *testing.T, db *gorm.DB) {
	t.Helper()
	if db.Error != nil {
		t.Fatalf("database operation failed: %v", db.Error)
	}
}

// must is an internal wrapper for Must to keep internal code readable.
func must(t *testing.T, db *gorm.DB) {
	Must(t, db)
}

// DeliveryScenario provides a complete setup for testing webhook deliveries.
type DeliveryScenario struct {
	DB       *db.DB
	App      types.Application
	Endpoint types.Endpoint
	Event    types.Event
	Delivery types.EventDelivery
}

// DeliveryScenarioOptions configures a DeliveryScenario.
type DeliveryScenarioOptions struct {
	AppID          string
	OrganizationID string
	EndpointURL    string
	EndpointStatus types.EndpointStatus
	EventType      string
	EventPayload   types.JSONB
	DeliveryStatus types.DeliveryStatus
}

// NewDeliveryScenario creates a complete delivery test scenario with app, endpoint, event, and delivery.
func NewDeliveryScenario(t *testing.T, opts ...func(*DeliveryScenarioOptions)) *DeliveryScenario {
	t.Helper()

	options := &DeliveryScenarioOptions{
		EndpointURL:    "https://example.com/webhook",
		EndpointStatus: types.EndpointStatusHealthy,
		EventType:      "test.event",
		EventPayload:   types.JSONB{"test": "data"},
		DeliveryStatus: types.DeliveryStatusQueued,
	}

	for _, opt := range opts {
		opt(options)
	}

	database := SetupDatabase(t)

	app := NewTestApplication(
		WithAppID(options.AppID),
		WithOrganizationID(options.OrganizationID),
	)
	must(t, database.Create(&app))

	endpoint := NewTestEndpoint(
		WithApplicationID(app.ID),
		WithURL(options.EndpointURL),
		WithEndpointStatus(options.EndpointStatus),
	)
	must(t, database.Create(&endpoint))

	event := NewTestEvent(
		WithEventApplicationID(app.ID),
		WithEventOrganizationID(app.OrganizationID),
		WithEventTypeForEvent(options.EventType),
		WithEventPayload(options.EventPayload),
	)
	must(t, database.Create(&event))

	delivery := NewTestDelivery(
		WithEventIDForDelivery(event.ID),
		WithEndpointIDForDelivery(endpoint.ID),
		WithDeliveryStatus(options.DeliveryStatus),
	)
	must(t, database.Create(&delivery))

	return &DeliveryScenario{
		DB:       database,
		App:      app,
		Endpoint: endpoint,
		Event:    event,
		Delivery: delivery,
	}
}

// HealthScenario provides a setup for testing endpoint health tracking.
type HealthScenario struct {
	DB       *db.DB
	App      types.Application
	Endpoint types.Endpoint
	Health   types.EndpointHealth
}

// HealthScenarioOptions configures a HealthScenario.
type HealthScenarioOptions struct {
	EndpointStatus   types.EndpointStatus
	HealthScore      int
	ConsecutiveFails int
	HealthStatus     types.EndpointStatus
}

// NewHealthScenario creates a health tracking test scenario with endpoint and health record.
func NewHealthScenario(t *testing.T, opts ...func(*HealthScenarioOptions)) *HealthScenario {
	t.Helper()

	options := &HealthScenarioOptions{
		EndpointStatus:   types.EndpointStatusHealthy,
		HealthScore:      100,
		ConsecutiveFails: 0,
		HealthStatus:     types.EndpointStatusHealthy,
	}

	for _, opt := range opts {
		opt(options)
	}

	database := SetupDatabase(t)

	app := NewTestApplication()
	must(t, database.Create(&app))

	endpoint := NewTestEndpoint(
		WithApplicationID(app.ID),
		WithEndpointStatus(options.EndpointStatus),
	)
	must(t, database.Create(&endpoint))

	health := NewTestEndpointHealth(
		WithHealthEndpointID(endpoint.ID),
		WithEndpointHealthScore(options.HealthScore),
		WithConsecutiveFails(options.ConsecutiveFails),
		WithHealthStatus(options.HealthStatus),
	)
	must(t, database.Create(&health))

	return &HealthScenario{
		DB:       database,
		App:      app,
		Endpoint: endpoint,
		Health:   health,
	}
}

// E2EScenario provides a complete end-to-end test environment.
type E2EScenario struct {
	DB        *db.DB
	Worker    *worker.Worker
	Publisher *queue.Publisher
	Server    *httptest.Server
	App       types.Application
	Endpoint  types.Endpoint
	cleanup   func()
}

// E2EScenarioOptions configures an E2EScenario.
type E2EScenarioOptions struct {
	ServerHandler http.HandlerFunc
	WorkerTimeout int
}

// NewE2EScenario creates a complete end-to-end test environment with database, queue, worker, and test server.
func NewE2EScenario(t *testing.T, opts ...func(*E2EScenarioOptions)) *E2EScenario {
	t.Helper()

	options := &E2EScenarioOptions{
		ServerHandler: func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
		},
		WorkerTimeout: 5,
	}

	for _, opt := range opts {
		opt(options)
	}

	database := SetupDatabase(t)

	if err := queue.EnsureQueues(GetRabbitMQURL()); err != nil {
		t.Fatalf("failed to ensure queues: %v", err)
	}

	server := httptest.NewServer(options.ServerHandler)

	app := NewTestApplication()
	must(t, database.Create(&app))

	endpoint := NewTestEndpoint(
		WithApplicationID(app.ID),
		WithURL(server.URL),
	)
	must(t, database.Create(&endpoint))

	w, err := worker.NewWorker(database.DB, GetRabbitMQURL(), time.Duration(options.WorkerTimeout)*time.Second)
	if err != nil {
		server.Close()
		t.Fatalf("failed to create worker: %v", err)
	}

	publisher, err := queue.NewPublisher(GetRabbitMQURL())
	if err != nil {
		w.Stop()
		server.Close()
		t.Fatalf("failed to create publisher: %v", err)
	}

	return &E2EScenario{
		DB:        database,
		Worker:    w,
		Publisher: publisher,
		Server:    server,
		App:       app,
		Endpoint:  endpoint,
		cleanup: func() {
			publisher.Close()
			w.Stop()
			server.Close()
		},
	}
}

// Cleanup closes all resources in the E2E scenario.
func (s *E2EScenario) Cleanup() {
	if s.cleanup != nil {
		s.cleanup()
	}
}
