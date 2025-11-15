package types

import (
	"database/sql/driver"
	"encoding/json"
	"errors"
)

type JSONB map[string]interface{}

func (j JSONB) Value() (driver.Value, error) {
	if j == nil {
		return nil, nil
	}
	return json.Marshal(j)
}

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

type SignatureAlgo string

const (
	SignatureAlgoSHA256 SignatureAlgo = "sha256"
	SignatureAlgoSHA512 SignatureAlgo = "sha512"
)

type DeliveryStatus string

const (
	DeliveryStatusQueued     DeliveryStatus = "queued"
	DeliveryStatusDelivering DeliveryStatus = "delivering"
	DeliveryStatusDelivered  DeliveryStatus = "delivered"
	DeliveryStatusFailed     DeliveryStatus = "failed"
	DeliveryStatusCancelled  DeliveryStatus = "cancelled"
)

type EndpointStatus string

const (
	EndpointStatusHealthy  EndpointStatus = "healthy"
	EndpointStatusDegraded EndpointStatus = "degraded"
	EndpointStatusFailing  EndpointStatus = "failing"
	EndpointStatusDisabled EndpointStatus = "disabled"
)

type RetryStrategy string

const (
	RetryStrategyExponential RetryStrategy = "exponential"
	RetryStrategyLinear      RetryStrategy = "linear"
	RetryStrategyConstant    RetryStrategy = "constant"
)

type DeliveryMode string

const (
	DeliveryModeAsync DeliveryMode = "async"
	DeliveryModeSync  DeliveryMode = "sync"
)

type FilterMode string

const (
	FilterModeAllow FilterMode = "allow"
	FilterModeBlock FilterMode = "block"
)
