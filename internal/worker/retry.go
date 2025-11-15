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
	baseDelay := 5 * time.Second
	maxDelay := 1 * time.Hour

	delay := float64(baseDelay) * math.Pow(2, float64(attemptNumber-1))
	if delay > float64(maxDelay) {
		delay = float64(maxDelay)
	}

	jitter := rand.Float64() * 0.2 * delay
	return time.Duration(delay + jitter)
}

// linearBackoff calculates linear backoff with jitter.
// Delay increases by 30 seconds per attempt, max 15 minutes.
func linearBackoff(attemptNumber int) time.Duration {
	baseDelay := 30 * time.Second
	maxDelay := 15 * time.Minute

	delay := float64(baseDelay) * float64(attemptNumber)
	if delay > float64(maxDelay) {
		delay = float64(maxDelay)
	}

	jitter := rand.Float64() * 0.1 * delay
	return time.Duration(delay + jitter)
}

// constantBackoff returns a constant 60 second delay with jitter.
func constantBackoff() time.Duration {
	baseDelay := 60 * time.Second
	jitter := rand.Float64() * 0.1 * float64(baseDelay)
	return time.Duration(float64(baseDelay) + jitter)
}

// ShouldRetry determines if a delivery should be retried based on the attempt count and result.
func ShouldRetry(attemptNumber int, maxRetries int, retryable bool) bool {
	return retryable && attemptNumber < maxRetries
}
