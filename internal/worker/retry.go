package worker

import (
	"math"
	"math/rand"
	"time"

	"github.com/usevon/von/pkg/types"
)

// CalculateBackoff calculates the next retry delay based on the retry strategy.
func CalculateBackoff(attemptNumber int, strategy types.RetryStrategy) time.Duration {
	switch strategy {
	case types.RetryStrategyExponential:
		return exponentialBackoff(attemptNumber)
	case types.RetryStrategyLinear:
		return linearBackoff(attemptNumber)
	case types.RetryStrategyConstant:
		return constantBackoff()
	default:
		return exponentialBackoff(attemptNumber)
	}
}

// exponentialBackoff calculates exponential backoff with jitter.
// Base delay is 5 seconds, max delay is 1 hour.
func exponentialBackoff(attemptNumber int) time.Duration {
	delay := math.Min(float64(5*time.Second)*math.Pow(2, float64(attemptNumber-1)), float64(time.Hour))
	return time.Duration(delay * (1 + rand.Float64()*0.2))
}

// linearBackoff calculates linear backoff with jitter.
// Delay increases by 30 seconds per attempt, max 15 minutes.
func linearBackoff(attemptNumber int) time.Duration {
	delay := math.Min(float64(30*time.Second)*float64(attemptNumber), float64(15*time.Minute))
	return time.Duration(delay * (1 + rand.Float64()*0.1))
}

// constantBackoff returns a constant 60 second delay with jitter.
func constantBackoff() time.Duration {
	return time.Duration(float64(60*time.Second) * (1 + rand.Float64()*0.1))
}

// ShouldRetry determines if a delivery should be retried based on the attempt count and result.
func ShouldRetry(attemptNumber int, maxRetries int, retryable bool) bool {
	return retryable && attemptNumber < maxRetries
}
