package types

import "time"

type User struct {
	ID            string     `gorm:"type:uuid;primaryKey"`
	Name          string     `gorm:"not null"`
	Email         string     `gorm:"uniqueIndex;not null"`
	EmailVerified bool       `gorm:"default:false"`
	AvatarURL     *string
	CreatedAt     time.Time
	UpdatedAt     time.Time
}

func (User) TableName() string {
	return "user"
}

type Organization struct {
	ID        string     `gorm:"type:uuid;primaryKey"`
	Name      string     `gorm:"not null"`
	Slug      string     `gorm:"uniqueIndex;not null"`
	LogoURL   *string
	CreatedAt time.Time
	UpdatedAt time.Time
}

func (Organization) TableName() string {
	return "organization"
}

type Member struct {
	ID             string     `gorm:"type:uuid;primaryKey"`
	OrganizationID string     `gorm:"type:uuid;index:idx_org_user,unique;not null"`
	UserID         string     `gorm:"type:uuid;index:idx_org_user,unique;not null"`
	Role           string     `gorm:"not null"`
	CreatedAt      time.Time

	Organization Organization `gorm:"foreignKey:OrganizationID;constraint:OnDelete:CASCADE"`
	User         User         `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE"`
}

func (Member) TableName() string {
	return "member"
}

type APIKey struct {
	ID             string     `gorm:"type:uuid;primaryKey"`
	OrganizationID string     `gorm:"type:uuid;index;not null"`
	Name           string     `gorm:"not null"`
	KeyHash        string     `gorm:"uniqueIndex;not null"`
	KeyPrefix      string     `gorm:"index;not null"`
	Scopes         JSONB      `gorm:"type:jsonb"`
	RateLimitRPM   *int
	ExpiresAt      *time.Time
	LastUsedAt     *time.Time
	CreatedBy      string     `gorm:"type:uuid;not null"`
	RevokedAt      *time.Time
	CreatedAt      time.Time

	Organization Organization `gorm:"foreignKey:OrganizationID;constraint:OnDelete:CASCADE"`
}

func (APIKey) TableName() string {
	return "apikey"
}
