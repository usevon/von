package usage

import (
	"context"
	"time"

	"github.com/usevon/von/internal/queue"
	"github.com/usevon/von/pkg/types"
	"gorm.io/gorm"
)

// Tracker records usage metrics for billing and analytics.
type Tracker struct {
	db        *gorm.DB
	publisher *queue.Publisher
}

// NewTracker creates a new usage metrics tracker.
func NewTracker(db *gorm.DB, publisher *queue.Publisher) *Tracker {
	return &Tracker{
		db:        db,
		publisher: publisher,
	}
}

// TrackEvent records an event sent to the system (async via RabbitMQ).
func (t *Tracker) TrackEvent(ctx context.Context, organizationID string, payloadSize int) error {
	return t.publisher.PublishUsageEvent(ctx, &types.UsageEvent{
		OrganizationID: organizationID,
		EventType:      "event",
		PayloadSize:    payloadSize,
		Timestamp:      time.Now(),
	})
}

// TrackDelivery records a webhook delivery (async via RabbitMQ).
func (t *Tracker) TrackDelivery(ctx context.Context, organizationID string, successful bool) error {
	return t.publisher.PublishUsageEvent(ctx, &types.UsageEvent{
		OrganizationID: organizationID,
		EventType:      "delivery",
		Successful:     successful,
		Timestamp:      time.Now(),
	})
}

// TrackRetry records a delivery retry attempt (async via RabbitMQ).
func (t *Tracker) TrackRetry(ctx context.Context, organizationID string) error {
	return t.publisher.PublishUsageEvent(ctx, &types.UsageEvent{
		OrganizationID: organizationID,
		EventType:      "retry",
		Timestamp:      time.Now(),
	})
}

// GetUsage retrieves usage metrics for an organization and time period.
func (t *Tracker) GetUsage(ctx context.Context, organizationID string, periodStart time.Time) (*types.UsageMetrics, error) {
	var metrics types.UsageMetrics
	err := t.db.WithContext(ctx).Where("organization_id = ? AND period_start = ?", organizationID, periodStart).First(&metrics).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, err
	}
	return &metrics, nil
}

// GetCurrentMonthUsage retrieves current month usage for an organization.
func (t *Tracker) GetCurrentMonthUsage(ctx context.Context, organizationID string) (*types.UsageMetrics, error) {
	now := time.Now()
	periodStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC)
	return t.GetUsage(ctx, organizationID, periodStart)
}
