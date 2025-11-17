package mocks

import (
	"context"

	"github.com/usevon/von/internal/service"
	"github.com/usevon/von/pkg/types"
)

// MockEndpointService mocks the endpoint service for testing
type MockEndpointService struct {
	CreateEndpointFunc            func(ctx context.Context, req *service.CreateEndpointRequest) (*types.Endpoint, error)
	GetEndpointFunc               func(ctx context.Context, id string) (*types.Endpoint, error)
	ListEndpointsByApplicationFunc func(ctx context.Context, appID string) ([]types.Endpoint, error)
	UpdateEndpointFunc            func(ctx context.Context, id string, req *service.UpdateEndpointRequest) (*types.Endpoint, error)
	DeleteEndpointFunc            func(ctx context.Context, id string) error
}

func (m *MockEndpointService) CreateEndpoint(ctx context.Context, req *service.CreateEndpointRequest) (*types.Endpoint, error) {
	if m.CreateEndpointFunc != nil {
		return m.CreateEndpointFunc(ctx, req)
	}
	return nil, nil
}

func (m *MockEndpointService) GetEndpoint(ctx context.Context, id string) (*types.Endpoint, error) {
	if m.GetEndpointFunc != nil {
		return m.GetEndpointFunc(ctx, id)
	}
	return nil, nil
}

func (m *MockEndpointService) ListEndpointsByApplication(ctx context.Context, appID string) ([]types.Endpoint, error) {
	if m.ListEndpointsByApplicationFunc != nil {
		return m.ListEndpointsByApplicationFunc(ctx, appID)
	}
	return nil, nil
}

func (m *MockEndpointService) UpdateEndpoint(ctx context.Context, id string, req *service.UpdateEndpointRequest) (*types.Endpoint, error) {
	if m.UpdateEndpointFunc != nil {
		return m.UpdateEndpointFunc(ctx, id, req)
	}
	return nil, nil
}

func (m *MockEndpointService) DeleteEndpoint(ctx context.Context, id string) error {
	if m.DeleteEndpointFunc != nil {
		return m.DeleteEndpointFunc(ctx, id)
	}
	return nil
}

// MockEventService mocks the event service for testing
type MockEventService struct {
	CreateEventFunc func(ctx context.Context, req *service.CreateEventRequest) (*service.CreateEventResponse, error)
	GetEventFunc    func(ctx context.Context, id string) (*types.Event, error)
}

func (m *MockEventService) CreateEvent(ctx context.Context, req *service.CreateEventRequest) (*service.CreateEventResponse, error) {
	if m.CreateEventFunc != nil {
		return m.CreateEventFunc(ctx, req)
	}
	return nil, nil
}

func (m *MockEventService) GetEvent(ctx context.Context, id string) (*types.Event, error) {
	if m.GetEventFunc != nil {
		return m.GetEventFunc(ctx, id)
	}
	return nil, nil
}

// MockDeliveryService mocks the delivery service for testing
type MockDeliveryService struct {
	GetDeliveryFunc         func(ctx context.Context, id string) (*types.EventDelivery, error)
	ListDeliveriesFunc      func(ctx context.Context, filters *service.DeliveryFilters) ([]types.EventDelivery, error)
	GetDeliveryAttemptsFunc func(ctx context.Context, deliveryID string) ([]types.DeliveryAttempt, error)
	RetryDeliveryFunc       func(ctx context.Context, deliveryID string) error
}

func (m *MockDeliveryService) GetDelivery(ctx context.Context, id string) (*types.EventDelivery, error) {
	if m.GetDeliveryFunc != nil {
		return m.GetDeliveryFunc(ctx, id)
	}
	return nil, nil
}

func (m *MockDeliveryService) ListDeliveries(ctx context.Context, filters *service.DeliveryFilters) ([]types.EventDelivery, error) {
	if m.ListDeliveriesFunc != nil {
		return m.ListDeliveriesFunc(ctx, filters)
	}
	return nil, nil
}

func (m *MockDeliveryService) GetDeliveryAttempts(ctx context.Context, deliveryID string) ([]types.DeliveryAttempt, error) {
	if m.GetDeliveryAttemptsFunc != nil {
		return m.GetDeliveryAttemptsFunc(ctx, deliveryID)
	}
	return nil, nil
}

func (m *MockDeliveryService) RetryDelivery(ctx context.Context, deliveryID string) error {
	if m.RetryDeliveryFunc != nil {
		return m.RetryDeliveryFunc(ctx, deliveryID)
	}
	return nil
}
