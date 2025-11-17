package repository

import (
	"context"

	"github.com/usevon/von/pkg/types"
)

// EndpointRepository handles endpoint data access.
type EndpointRepository interface {
	// GetByID retrieves an endpoint by its ID. Returns ErrNotFound if the endpoint doesn't exist.
	GetByID(ctx context.Context, id string) (*types.Endpoint, error)

	// ListByApplicationID retrieves all endpoints for an application, optionally filtered by status.
	ListByApplicationID(ctx context.Context, appID string, status ...types.EndpointStatus) ([]types.Endpoint, error)

	// Create persists a new endpoint.
	Create(ctx context.Context, endpoint *types.Endpoint) error

	// Update saves changes to an existing endpoint.
	Update(ctx context.Context, endpoint *types.Endpoint) error

	// Delete removes an endpoint by ID. Returns ErrNotFound if the endpoint doesn't exist.
	Delete(ctx context.Context, id string) error

	// UpdateHealth updates the health tracking record for an endpoint.
	UpdateHealth(ctx context.Context, id string, health *types.EndpointHealth) error
}

// EventRepository handles event data access.
type EventRepository interface {
	// GetByID retrieves an event by its ID. Returns ErrNotFound if the event doesn't exist.
	GetByID(ctx context.Context, id string) (*types.Event, error)

	// Create persists a new event.
	Create(ctx context.Context, event *types.Event) error
}

// DeliveryRepository handles delivery data access.
type DeliveryRepository interface {
	// GetByID retrieves a delivery by its ID. Returns ErrNotFound if the delivery doesn't exist.
	GetByID(ctx context.Context, id string) (*types.EventDelivery, error)

	// ListByApplicationID retrieves all deliveries for an application, optionally filtered by status.
	ListByApplicationID(ctx context.Context, appID string, status ...types.DeliveryStatus) ([]types.EventDelivery, error)

	// ListByEventID retrieves all deliveries for a specific event.
	ListByEventID(ctx context.Context, eventID string) ([]types.EventDelivery, error)

	// Create persists a new delivery.
	Create(ctx context.Context, delivery *types.EventDelivery) error

	// Update saves changes to an existing delivery.
	Update(ctx context.Context, delivery *types.EventDelivery) error

	// GetAttempts retrieves all delivery attempts for a specific delivery, ordered by attempt number.
	GetAttempts(ctx context.Context, deliveryID string) ([]types.DeliveryAttempt, error)

	// CreateAttempt persists a new delivery attempt.
	CreateAttempt(ctx context.Context, attempt *types.DeliveryAttempt) error
}
