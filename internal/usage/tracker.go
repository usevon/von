package usage

import (
	"context"
	"fmt"
	"time"

	"github.com/usevon/von/pkg/types"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// Tracker records usage metrics for billing and analytics.
type Tracker struct {
	db *gorm.DB
}

// NewTracker creates a new usage metrics tracker.
func NewTracker(db *gorm.DB) *Tracker {
	return &Tracker{db: db}
}

// TrackEvent records an event sent to the system.
func (t *Tracker) TrackEvent(ctx context.Context, organizationID string, payloadSize int) error {
	now := time.Now()
	periodStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC)
	periodEnd := periodStart.AddDate(0, 1, 0)

	return t.db.WithContext(ctx).Clauses(clause.OnConflict{
		Columns: []clause.Column{{Name: "organization_id"}, {Name: "period_start"}},
		DoUpdates: clause.Assignments(map[string]interface{}{
			"events_sent":  gorm.Expr("usage_metrics.events_sent + 1"),
			"total_bytes":  gorm.Expr("usage_metrics.total_bytes + ?", payloadSize),
			"updated_at":   now,
		}),
	}).Create(&types.UsageMetrics{
		OrganizationID: organizationID,
		PeriodStart:    periodStart,
		PeriodEnd:      periodEnd,
		EventsSent:     1,
		TotalBytes:     int64(payloadSize),
		CreatedAt:      now,
		UpdatedAt:      now,
	}).Error
}

// TrackDelivery records a successful webhook delivery.
func (t *Tracker) TrackDelivery(ctx context.Context, organizationID string, successful bool) error {
	now := time.Now()
	periodStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC)
	periodEnd := periodStart.AddDate(0, 1, 0)

	updates := make(map[string]interface{})
	if successful {
		updates["events_delivered"] = gorm.Expr("usage_metrics.events_delivered + 1")
	} else {
		updates["events_failed"] = gorm.Expr("usage_metrics.events_failed + 1")
	}
	updates["updated_at"] = now

	return t.db.WithContext(ctx).Clauses(clause.OnConflict{
		Columns: []clause.Column{{Name: "organization_id"}, {Name: "period_start"}},
		DoUpdates: clause.Assignments(updates),
	}).Create(&types.UsageMetrics{
		OrganizationID: organizationID,
		PeriodStart:    periodStart,
		PeriodEnd:      periodEnd,
		EventsDelivered: func() int64 {
			if successful {
				return 1
			}
			return 0
		}(),
		EventsFailed: func() int64 {
			if !successful {
				return 1
			}
			return 0
		}(),
		CreatedAt: now,
		UpdatedAt: now,
	}).Error
}

// TrackRetry records a delivery retry attempt.
func (t *Tracker) TrackRetry(ctx context.Context, organizationID string) error {
	now := time.Now()
	periodStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC)
	periodEnd := periodStart.AddDate(0, 1, 0)

	return t.db.WithContext(ctx).Clauses(clause.OnConflict{
		Columns: []clause.Column{{Name: "organization_id"}, {Name: "period_start"}},
		DoUpdates: clause.Assignments(map[string]interface{}{
			"total_retries": gorm.Expr("usage_metrics.total_retries + 1"),
			"updated_at":    now,
		}),
	}).Create(&types.UsageMetrics{
		OrganizationID: organizationID,
		PeriodStart:    periodStart,
		PeriodEnd:      periodEnd,
		TotalRetries:   1,
		CreatedAt:      now,
		UpdatedAt:      now,
	}).Error
}

// GetUsage retrieves usage metrics for an organization and time period.
func (t *Tracker) GetUsage(ctx context.Context, organizationID string, periodStart time.Time) (*types.UsageMetrics, error) {
	var metrics types.UsageMetrics
	err := t.db.WithContext(ctx).Where("organization_id = ? AND period_start = ?", organizationID, periodStart).First(&metrics).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("no usage metrics found for organization %s in period %s", organizationID, periodStart.Format("2006-01"))
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
