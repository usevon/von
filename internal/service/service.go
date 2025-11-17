package service

import (
	"context"

	"github.com/usevon/von/pkg/types"
)

// EndpointService handles business logic for webhook endpoints.
type EndpointService interface {
	// CreateEndpoint creates a new endpoint with validation and defaults.
	CreateEndpoint(ctx context.Context, req *CreateEndpointRequest) (*types.Endpoint, error)

	// GetEndpoint retrieves an endpoint by ID.
	GetEndpoint(ctx context.Context, id string) (*types.Endpoint, error)

	// ListEndpointsByApplication retrieves all endpoints for an application.
	ListEndpointsByApplication(ctx context.Context, appID string) ([]types.Endpoint, error)

	// UpdateEndpoint updates an existing endpoint.
	UpdateEndpoint(ctx context.Context, id string, req *UpdateEndpointRequest) (*types.Endpoint, error)

	// DeleteEndpoint removes an endpoint by ID.
	DeleteEndpoint(ctx context.Context, id string) error
}

// EventService handles business logic for webhook events.
type EventService interface {
	// CreateEvent creates a new event and queues it to matching endpoints.
	CreateEvent(ctx context.Context, req *CreateEventRequest) (*CreateEventResponse, error)

	// GetEvent retrieves an event by ID.
	GetEvent(ctx context.Context, id string) (*types.Event, error)
}

// DeliveryService handles business logic for webhook deliveries.
type DeliveryService interface {
	// GetDelivery retrieves a delivery by ID.
	GetDelivery(ctx context.Context, id string) (*types.EventDelivery, error)

	// ListDeliveries retrieves deliveries with optional filters.
	ListDeliveries(ctx context.Context, filters *DeliveryFilters) ([]types.EventDelivery, error)

	// GetDeliveryAttempts retrieves all attempts for a delivery.
	GetDeliveryAttempts(ctx context.Context, deliveryID string) ([]types.DeliveryAttempt, error)

	// RetryDelivery manually retries a failed delivery.
	RetryDelivery(ctx context.Context, deliveryID string) error
}

// CreateEndpointRequest contains parameters for creating an endpoint.
type CreateEndpointRequest struct {
	ApplicationID  string
	URL            string
	Description    string
	SigningAlgo    string
	EventFilters   []string
	FilterMode     string
	CustomHeaders  map[string]string
	TimeoutSeconds int
	RetryStrategy  string
	MaxRetries     int
}

// UpdateEndpointRequest contains parameters for updating an endpoint.
type UpdateEndpointRequest struct {
	URL            *string
	Description    *string
	EventFilters   []string
	FilterMode     *string
	CustomHeaders  map[string]string
	TimeoutSeconds *int
	MaxRetries     *int
	Status         *string
}

// CreateEventRequest contains parameters for creating an event.
type CreateEventRequest struct {
	ApplicationID string
	EventType     string
	EventVersion  string
	Payload       map[string]interface{}
	DeliveryMode  string
}

// CreateEventResponse contains the result of creating an event.
type CreateEventResponse struct {
	EventID       string
	DeliveryIDs   []string
	EndpointCount int
	QueuedAt      int64
}

// DeliveryFilters contains optional filters for listing deliveries.
type DeliveryFilters struct {
	EventID    string
	EndpointID string
	Status     string
	Limit      int
}
