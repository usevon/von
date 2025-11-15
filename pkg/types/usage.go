package types

import "time"

type UsageMetrics struct {
	ID             string    `gorm:"type:uuid;primaryKey"`
	OrganizationID string    `gorm:"type:uuid;index:idx_org_period,unique;not null"`
	PeriodStart    time.Time `gorm:"index:idx_org_period,unique;not null"`
	PeriodEnd      time.Time `gorm:"not null"`

	EventsSent      int64 `gorm:"default:0"`
	EventsDelivered int64 `gorm:"default:0"`
	EventsFailed    int64 `gorm:"default:0"`

	PeakRPS int
	AvgRPS  int

	TotalRetries int64 `gorm:"default:0"`
	TotalBytes   int64 `gorm:"default:0"`

	TunnelMinutes int `gorm:"default:0"`

	CreatedAt time.Time
	UpdatedAt time.Time
}

func (UsageMetrics) TableName() string {
	return "usage_metrics"
}
