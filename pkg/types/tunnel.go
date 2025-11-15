package types

import "time"

type TunnelSession struct {
	ID             string     `gorm:"type:uuid;primaryKey"`
	OrganizationID string     `gorm:"type:uuid;index;not null"`
	UserID         string     `gorm:"type:uuid;not null"`
	ApplicationID  *string    `gorm:"type:uuid"`

	TunnelID  string `gorm:"uniqueIndex;not null"`
	PublicURL string `gorm:"uniqueIndex;not null"`
	LocalURL  string `gorm:"not null"`

	Status         string `gorm:"not null"`
	WSConnectionID string
	LastPingAt     *time.Time

	RequestsProxied  int
	BytesTransferred int64

	StartedAt time.Time  `gorm:"not null"`
	ExpiresAt time.Time  `gorm:"not null"`
	EndedAt   *time.Time
	CreatedAt time.Time
}

func (TunnelSession) TableName() string {
	return "tunnel_session"
}
