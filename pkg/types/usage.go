package types

import "time"

// UsageMetrics tracks webhook usage statistics for billing and analytics.
// Metrics are aggregated per organization and time period.
type UsageMetrics struct {
	ID             string    `gorm:"type:uuid;primaryKey"`
	OrganizationID string    `gorm:"type:uuid;uniqueIndex:idx_org_period;not null"`
	PeriodStart    time.Time `gorm:"uniqueIndex:idx_org_period;not null"`
	PeriodEnd      time.Time `gorm:"not null"`
	EventsSent     int64     `gorm:"default:0"`
	EventsDelivered int64    `gorm:"default:0"`
	EventsFailed   int64     `gorm:"default:0"`
	PeakRPS        int       `gorm:"default:0"`
	AvgRPS         int       `gorm:"default:0"`
	TotalRetries   int64     `gorm:"default:0"`
	TotalBytes     int64     `gorm:"default:0"`
	TunnelMinutes  int       `gorm:"default:0"`
	CreatedAt      time.Time
	UpdatedAt      time.Time
}

// TableName returns the database table name for UsageMetrics.
func (UsageMetrics) TableName() string {
	return "usage_metrics"
}

// UsageEvent represents a single usage event to be aggregated.
type UsageEvent struct {
	OrganizationID string
	EventType      string // "event", "delivery", "retry"
	PayloadSize    int
	Successful     bool
	Timestamp      time.Time
}
