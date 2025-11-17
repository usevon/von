package service

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/usevon/von/internal/repository"
	"github.com/usevon/von/pkg/types"
	"gorm.io/gorm"
)

var (
	ErrEventNotFound = errors.New("event not found")
)

type WebhookPublisher interface {
	PublishWebhook(ctx context.Context, msg *types.QueueMessage) error
}

type eventService struct {
	db           *gorm.DB
	eventRepo    repository.EventRepository
	endpointRepo repository.EndpointRepository
	deliveryRepo repository.DeliveryRepository
	publisher    WebhookPublisher
}

// NewEventService creates a new event service.
func NewEventService(
	db *gorm.DB,
	eventRepo repository.EventRepository,
	endpointRepo repository.EndpointRepository,
	deliveryRepo repository.DeliveryRepository,
	publisher WebhookPublisher,
) EventService {
	return &eventService{
		db:           db,
		eventRepo:    eventRepo,
		endpointRepo: endpointRepo,
		deliveryRepo: deliveryRepo,
		publisher:    publisher,
	}
}

func (s *eventService) CreateEvent(ctx context.Context, req *CreateEventRequest) (*CreateEventResponse, error) {
	if req.ApplicationID == "" || req.EventType == "" {
		return nil, ErrInvalidRequest
	}

	if req.Payload == nil || len(req.Payload) == 0 {
		return nil, ErrInvalidRequest
	}

	var app types.Application
	if err := s.db.Where("id = ?", req.ApplicationID).First(&app).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, ErrApplicationNotFound
		}
		return nil, err
	}

	deliveryMode := types.DeliveryModeAsync
	if req.DeliveryMode == string(types.DeliveryModeSync) {
		deliveryMode = types.DeliveryModeSync
	}

	event := &types.Event{
		ID:             uuid.New().String(),
		ApplicationID:  req.ApplicationID,
		OrganizationID: app.OrganizationID,
		EventType:      req.EventType,
		EventVersion:   req.EventVersion,
		Payload:        req.Payload,
		DeliveryMode:   deliveryMode,
		CreatedAt:      time.Now(),
	}

	payloadBytes, _ := json.Marshal(req.Payload)
	event.PayloadSize = len(payloadBytes)

	if err := s.eventRepo.Create(ctx, event); err != nil {
		return nil, err
	}

	endpoints, err := s.endpointRepo.ListByApplicationID(ctx, req.ApplicationID)
	if err != nil {
		return nil, err
	}

	matchingEndpoints := make([]types.Endpoint, 0)
	for _, endpoint := range endpoints {
		if endpoint.Status != types.EndpointStatusDisabled && eventMatchesEndpoint(event, &endpoint) {
			matchingEndpoints = append(matchingEndpoints, endpoint)
		}
	}

	deliveryIDs := make([]string, 0, len(matchingEndpoints))

	for _, endpoint := range matchingEndpoints {
		delivery := &types.EventDelivery{
			ID:          uuid.New().String(),
			EventID:     event.ID,
			EndpointID:  endpoint.ID,
			Status:      types.DeliveryStatusQueued,
			MaxAttempts: endpoint.MaxRetries,
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		}

		if err := s.deliveryRepo.Create(ctx, delivery); err != nil {
			continue
		}

		deliveryIDs = append(deliveryIDs, delivery.ID)

		msg := types.NewQueueMessage(event, &endpoint, delivery)

		if err := s.publisher.PublishWebhook(context.Background(), &msg); err != nil {
			delivery.Status = types.DeliveryStatusFailed
			s.deliveryRepo.Update(ctx, delivery)
		}
	}

	return &CreateEventResponse{
		EventID:       event.ID,
		DeliveryIDs:   deliveryIDs,
		EndpointCount: len(deliveryIDs),
		QueuedAt:      time.Now().Unix(),
	}, nil
}

func (s *eventService) GetEvent(ctx context.Context, id string) (*types.Event, error) {
	event, err := s.eventRepo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return nil, ErrEventNotFound
		}
		return nil, err
	}
	return event, nil
}

// eventMatchesEndpoint reports whether the event matches the endpoint's filter configuration.
func eventMatchesEndpoint(event *types.Event, endpoint *types.Endpoint) bool {
	if len(endpoint.EventFilters) == 0 {
		return endpoint.FilterMode == types.FilterModeAllow
	}

	filtersInterface, ok := endpoint.EventFilters["filters"]
	if !ok {
		return endpoint.FilterMode == types.FilterModeAllow
	}

	filters, ok := filtersInterface.([]interface{})
	if !ok {
		return endpoint.FilterMode == types.FilterModeAllow
	}

	for _, filter := range filters {
		if filterStr, ok := filter.(string); ok && filterStr == event.EventType {
			return endpoint.FilterMode == types.FilterModeAllow
		}
	}

	return endpoint.FilterMode == types.FilterModeBlock
}
