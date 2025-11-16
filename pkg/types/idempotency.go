package types

import "time"

// IdempotencyKey stores request/response pairs for idempotent API operations.
type IdempotencyKey struct {
	ID           string    `gorm:"type:uuid;primaryKey" json:"id"`
	Key          string    `gorm:"type:varchar(255);uniqueIndex:idx_idempotency_key;not null" json:"key"`
	Method       string    `gorm:"type:varchar(10);not null" json:"method"`
	Path         string    `gorm:"type:text;not null" json:"path"`
	RequestBody  string    `gorm:"type:text" json:"request_body"`
	StatusCode   int       `gorm:"type:int;not null" json:"status_code"`
	ResponseBody string    `gorm:"type:text" json:"response_body"`
	ExpiresAt    time.Time `gorm:"type:timestamp;index;not null" json:"expires_at"`
	CreatedAt    time.Time `gorm:"type:timestamp;not null" json:"created_at"`
}

// TableName returns the database table name for IdempotencyKey.
func (IdempotencyKey) TableName() string {
	return "idempotency_key"
}
