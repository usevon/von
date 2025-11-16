package types

import "time"

// TunnelSession represents an active development tunnel for proxying webhooks to local endpoints.
// Tunnels are available on all pricing plans and track connection metrics.
type TunnelSession struct {
	ID             string     `gorm:"type:uuid;primaryKey"`
	OrganizationID string     `gorm:"type:uuid;index;not null"`
	UserID         string     `gorm:"type:uuid;index;not null"`
	ApplicationID  *string    `gorm:"type:uuid;index"`
	TunnelID       string     `gorm:"uniqueIndex;not null"`
	PublicURL      string     `gorm:"not null"`
	LocalURL       string     `gorm:"not null"`
	Status         string     `gorm:"index;not null"`
	WSConnectionID string     `gorm:"index"`
	RequestsProxied int       `gorm:"default:0"`
	BytesTransferred int64    `gorm:"default:0"`
	StartedAt      time.Time  `gorm:"not null"`
	ExpiresAt      time.Time  `gorm:"index;not null"`
	EndedAt        *time.Time `gorm:"index"`
	CreatedAt      time.Time
	UpdatedAt      time.Time
}

// TableName returns the database table name for TunnelSession.
func (TunnelSession) TableName() string {
	return "tunnel_session"
}
