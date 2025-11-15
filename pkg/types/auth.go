package types

import "time"

// User represents a user account.
// This table is managed by the TypeScript dashboard via Drizzle ORM.
type User struct {
	ID            string     `gorm:"type:uuid;primaryKey"`
	Name          string     `gorm:"not null"`
	Email         string     `gorm:"uniqueIndex;not null"`
	EmailVerified bool       `gorm:"default:false"`
	AvatarURL     *string
	CreatedAt     time.Time
	UpdatedAt     time.Time
}

// TableName returns the database table name for User.
func (User) TableName() string {
	return "user"
}

// Organization represents a multi-tenant organization.
// This table is managed by the TypeScript dashboard via Drizzle ORM.
type Organization struct {
	ID        string     `gorm:"type:uuid;primaryKey"`
	Name      string     `gorm:"not null"`
	Slug      string     `gorm:"uniqueIndex;not null"`
	LogoURL   *string
	CreatedAt time.Time
	UpdatedAt time.Time
}

// TableName returns the database table name for Organization.
func (Organization) TableName() string {
	return "organization"
}

// Member represents a user's membership in an organization.
// This table is managed by the TypeScript dashboard via Drizzle ORM.
type Member struct {
	ID             string     `gorm:"type:uuid;primaryKey"`
	OrganizationID string     `gorm:"type:uuid;index:idx_org_user,unique;not null"`
	UserID         string     `gorm:"type:uuid;index:idx_org_user,unique;not null"`
	Role           string     `gorm:"not null"`
	CreatedAt      time.Time

	Organization Organization `gorm:"foreignKey:OrganizationID;constraint:OnDelete:CASCADE"`
	User         User         `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE"`
}

// TableName returns the database table name for Member.
func (Member) TableName() string {
	return "member"
}

// APIKey represents an API key for authenticating requests to the Von API.
// This table is managed by the TypeScript dashboard via Drizzle ORM.
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

// TableName returns the database table name for APIKey.
func (APIKey) TableName() string {
	return "apikey"
}
