package types

import (
	"database/sql/driver"
	"encoding/json"
	"errors"
)

// JSONB represents a PostgreSQL JSONB column value.
type JSONB map[string]interface{}

// Value implements the driver.Valuer interface for database serialization.
func (j JSONB) Value() (driver.Value, error) {
	if j == nil {
		return nil, nil
	}
	return json.Marshal(j)
}

// Scan implements the sql.Scanner interface for database deserialization.
func (j *JSONB) Scan(value interface{}) error {
	if value == nil {
		*j = nil
		return nil
	}

	bytes, ok := value.([]byte)
	if !ok {
		return errors.New("failed to unmarshal JSONB value")
	}

	result := make(map[string]interface{})
	err := json.Unmarshal(bytes, &result)
	if err != nil {
		return err
	}

	*j = result
	return nil
}

// SignatureAlgo represents a webhook signature algorithm.
type SignatureAlgo string

const (
	SignatureAlgoSHA256 SignatureAlgo = "sha256"
	SignatureAlgoSHA512 SignatureAlgo = "sha512"
)

// DeliveryStatus represents the current state of a webhook delivery.
type DeliveryStatus string

const (
	DeliveryStatusQueued     DeliveryStatus = "queued"
	DeliveryStatusDelivering DeliveryStatus = "delivering"
	DeliveryStatusDelivered  DeliveryStatus = "delivered"
	DeliveryStatusFailed     DeliveryStatus = "failed"
	DeliveryStatusCancelled  DeliveryStatus = "cancelled"
)

// EndpointStatus represents the health status of a webhook endpoint.
type EndpointStatus string

const (
	EndpointStatusHealthy  EndpointStatus = "healthy"
	EndpointStatusDegraded EndpointStatus = "degraded"
	EndpointStatusFailing  EndpointStatus = "failing"
	EndpointStatusDisabled EndpointStatus = "disabled"
)

// RetryStrategy defines how failed webhook deliveries should be retried.
type RetryStrategy string

const (
	RetryStrategyExponential RetryStrategy = "exponential"
	RetryStrategyLinear      RetryStrategy = "linear"
	RetryStrategyConstant    RetryStrategy = "constant"
)

// DeliveryMode specifies whether a webhook should be delivered synchronously or asynchronously.
type DeliveryMode string

const (
	DeliveryModeAsync DeliveryMode = "async"
	DeliveryModeSync  DeliveryMode = "sync"
)

// FilterMode determines whether event filters act as an allowlist or blocklist.
type FilterMode string

const (
	FilterModeAllow FilterMode = "allow"
	FilterModeBlock FilterMode = "block"
)
