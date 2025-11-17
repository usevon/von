package repository

import (
	"context"
	"errors"

	"github.com/usevon/von/pkg/types"
	"gorm.io/gorm"
)

// Common repository errors.
var (
	ErrNotFound      = errors.New("record not found")
	ErrInvalidID     = errors.New("invalid id format")
	ErrAlreadyExists = errors.New("record already exists")
)

// endpointRepo implements EndpointRepository using GORM.
type endpointRepo struct {
	db *gorm.DB
}

// NewEndpointRepo creates a new endpoint repository.
func NewEndpointRepo(db *gorm.DB) EndpointRepository {
	return &endpointRepo{db: db}
}

func (r *endpointRepo) GetByID(ctx context.Context, id string) (*types.Endpoint, error) {
	var endpoint types.Endpoint
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&endpoint).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &endpoint, nil
}

func (r *endpointRepo) ListByApplicationID(ctx context.Context, appID string, status ...types.EndpointStatus) ([]types.Endpoint, error) {
	var endpoints []types.Endpoint
	query := r.db.WithContext(ctx).Where("application_id = ?", appID)

	if len(status) > 0 {
		query = query.Where("status IN ?", status)
	}

	err := query.Find(&endpoints).Error
	return endpoints, err
}

func (r *endpointRepo) Create(ctx context.Context, endpoint *types.Endpoint) error {
	return r.db.WithContext(ctx).Create(endpoint).Error
}

func (r *endpointRepo) Update(ctx context.Context, endpoint *types.Endpoint) error {
	return r.db.WithContext(ctx).Save(endpoint).Error
}

func (r *endpointRepo) Delete(ctx context.Context, id string) error {
	result := r.db.WithContext(ctx).Delete(&types.Endpoint{}, "id = ?", id)
	if result.RowsAffected == 0 {
		return ErrNotFound
	}
	return result.Error
}

func (r *endpointRepo) UpdateHealth(ctx context.Context, id string, health *types.EndpointHealth) error {
	return r.db.WithContext(ctx).Save(health).Error
}

// eventRepo implements EventRepository using GORM.
type eventRepo struct {
	db *gorm.DB
}

// NewEventRepo creates a new event repository backed by GORM.
func NewEventRepo(db *gorm.DB) EventRepository {
	return &eventRepo{db: db}
}

func (r *eventRepo) GetByID(ctx context.Context, id string) (*types.Event, error) {
	var event types.Event
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&event).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &event, nil
}

func (r *eventRepo) Create(ctx context.Context, event *types.Event) error {
	return r.db.WithContext(ctx).Create(event).Error
}

// deliveryRepo implements DeliveryRepository using GORM.
type deliveryRepo struct {
	db *gorm.DB
}

// NewDeliveryRepo creates a new delivery repository backed by GORM.
func NewDeliveryRepo(db *gorm.DB) DeliveryRepository {
	return &deliveryRepo{db: db}
}

func (r *deliveryRepo) GetByID(ctx context.Context, id string) (*types.EventDelivery, error) {
	var delivery types.EventDelivery
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&delivery).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &delivery, nil
}

func (r *deliveryRepo) ListByApplicationID(ctx context.Context, appID string, status ...types.DeliveryStatus) ([]types.EventDelivery, error) {
	var deliveries []types.EventDelivery

	// Join with events table to filter by application_id
	query := r.db.WithContext(ctx).
		Joins("JOIN event ON event.id = event_delivery.event_id").
		Where("event.application_id = ?", appID)

	if len(status) > 0 {
		query = query.Where("event_delivery.status IN ?", status)
	}

	err := query.Order("event_delivery.created_at DESC").Find(&deliveries).Error
	return deliveries, err
}

func (r *deliveryRepo) ListByEventID(ctx context.Context, eventID string) ([]types.EventDelivery, error) {
	var deliveries []types.EventDelivery
	err := r.db.WithContext(ctx).Where("event_id = ?", eventID).Find(&deliveries).Error
	return deliveries, err
}

func (r *deliveryRepo) Create(ctx context.Context, delivery *types.EventDelivery) error {
	return r.db.WithContext(ctx).Create(delivery).Error
}

func (r *deliveryRepo) Update(ctx context.Context, delivery *types.EventDelivery) error {
	return r.db.WithContext(ctx).Save(delivery).Error
}

func (r *deliveryRepo) GetAttempts(ctx context.Context, deliveryID string) ([]types.DeliveryAttempt, error) {
	var attempts []types.DeliveryAttempt
	err := r.db.WithContext(ctx).
		Where("delivery_id = ?", deliveryID).
		Order("attempt_number ASC").
		Find(&attempts).Error
	return attempts, err
}

func (r *deliveryRepo) CreateAttempt(ctx context.Context, attempt *types.DeliveryAttempt) error {
	return r.db.WithContext(ctx).Create(attempt).Error
}
