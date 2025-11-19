package service

import (
	"context"
	"errors"
	"time"

	"github.com/usevon/von/internal/repository"
	"github.com/usevon/von/pkg/types"
	"gorm.io/gorm"
)

var (
	ErrDeliveryNotFound      = errors.New("delivery not found")
	ErrCannotRetryDelivery   = errors.New("cannot retry delivery that is not failed")
	ErrEndpointDisabled      = errors.New("cannot retry delivery to disabled endpoint")
)

type deliveryService struct {
	db           *gorm.DB
	deliveryRepo repository.DeliveryRepository
	eventRepo    repository.EventRepository
	endpointRepo repository.EndpointRepository
	publisher    WebhookPublisher
}

// NewDeliveryService creates a new delivery service.
func NewDeliveryService(
	db *gorm.DB,
	deliveryRepo repository.DeliveryRepository,
	eventRepo repository.EventRepository,
	endpointRepo repository.EndpointRepository,
	publisher WebhookPublisher,
) DeliveryService {
	return &deliveryService{
		db:           db,
		deliveryRepo: deliveryRepo,
		eventRepo:    eventRepo,
		endpointRepo: endpointRepo,
		publisher:    publisher,
	}
}

func (s *deliveryService) GetDelivery(ctx context.Context, id string) (*types.EventDelivery, error) {
	delivery, err := s.deliveryRepo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return nil, ErrDeliveryNotFound
		}
		return nil, err
	}
	return delivery, nil
}

func (s *deliveryService) ListDeliveries(ctx context.Context, filters *DeliveryFilters) ([]types.EventDelivery, error) {
	query := s.db.Model(&types.EventDelivery{})

	if filters != nil {
		if filters.EventID != "" {
			query = query.Where("event_id = ?", filters.EventID)
		}
		if filters.EndpointID != "" {
			query = query.Where("endpoint_id = ?", filters.EndpointID)
		}
		if filters.Status != "" {
			query = query.Where("status = ?", filters.Status)
		}
		if filters.Limit > 0 {
			query = query.Limit(filters.Limit)
		} else {
			query = query.Limit(100)
		}
	} else {
		query = query.Limit(100)
	}

	var deliveries []types.EventDelivery
	if err := query.Order("created_at DESC").Find(&deliveries).Error; err != nil {
		return nil, err
	}

	return deliveries, nil
}

func (s *deliveryService) GetDeliveryAttempts(ctx context.Context, deliveryID string) ([]types.DeliveryAttempt, error) {
	return s.deliveryRepo.GetAttempts(ctx, deliveryID)
}

func (s *deliveryService) RetryDelivery(ctx context.Context, deliveryID string) error {
	delivery, err := s.deliveryRepo.GetByID(ctx, deliveryID)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return ErrDeliveryNotFound
		}
		return err
	}

	if (delivery.Status == types.DeliveryStatusDelivered || delivery.Status == types.DeliveryStatusCancelled) {
		return ErrCannotRetryDelivery
	}

	event, err := s.eventRepo.GetByID(ctx, delivery.EventID)
	if err != nil {
		return err
	}

	endpoint, err := s.endpointRepo.GetByID(ctx, delivery.EndpointID)
	if err != nil {
		return err
	}

	if endpoint.Status == types.EndpointStatusDisabled {
		return ErrEndpointDisabled
	}

	delivery.Status = types.DeliveryStatusQueued
	delivery.NextAttemptAt = nil
	delivery.UpdatedAt = time.Now()

	if err := s.deliveryRepo.Update(ctx, delivery); err != nil {
		return err
	}

	msg := types.NewQueueMessage(event, endpoint, delivery)
	msg.AttemptNumber = delivery.AttemptCount + 1

	if err := s.publisher.PublishWebhook(context.Background(), &msg); err != nil {
		return err
	}

	return nil
}
