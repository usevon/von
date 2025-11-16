package worker

import (
	"testing"
	"time"

	"github.com/usevon/von/pkg/types"
)

func TestCalculateBackoff(t *testing.T) {
	tests := []struct {
		name           string
		attemptNumber  int
		strategy       types.RetryStrategy
		expectedMin    time.Duration
		expectedMax    time.Duration
	}{
		{
			name:          "exponential attempt 1",
			attemptNumber: 1,
			strategy:      types.RetryStrategyExponential,
			expectedMin:   4 * time.Second,  // 5s - 20% jitter
			expectedMax:   6 * time.Second,  // 5s + 20% jitter
		},
		{
			name:          "exponential attempt 2",
			attemptNumber: 2,
			strategy:      types.RetryStrategyExponential,
			expectedMin:   8 * time.Second,  // 10s - 20% jitter
			expectedMax:   12 * time.Second, // 10s + 20% jitter
		},
		{
			name:          "exponential attempt 3",
			attemptNumber: 3,
			strategy:      types.RetryStrategyExponential,
			expectedMin:   16 * time.Second, // 20s - 20% jitter
			expectedMax:   24 * time.Second, // 20s + 20% jitter
		},
		{
			name:          "exponential attempt 4",
			attemptNumber: 4,
			strategy:      types.RetryStrategyExponential,
			expectedMin:   32 * time.Second, // 40s - 20% jitter
			expectedMax:   48 * time.Second, // 40s + 20% jitter
		},
		{
			name:          "linear attempt 1",
			attemptNumber: 1,
			strategy:      types.RetryStrategyLinear,
			expectedMin:   27 * time.Second, // 30s - 10% jitter
			expectedMax:   33 * time.Second, // 30s + 10% jitter
		},
		{
			name:          "linear attempt 2",
			attemptNumber: 2,
			strategy:      types.RetryStrategyLinear,
			expectedMin:   54 * time.Second,  // 60s - 10% jitter
			expectedMax:   66 * time.Second,  // 60s + 10% jitter
		},
		{
			name:          "constant backoff",
			attemptNumber: 1,
			strategy:      types.RetryStrategyConstant,
			expectedMin:   54 * time.Second, // 60s - 10% jitter
			expectedMax:   66 * time.Second, // 60s + 10% jitter
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			backoff := CalculateBackoff(tt.attemptNumber, tt.strategy)

			if backoff < tt.expectedMin || backoff > tt.expectedMax {
				t.Errorf("backoff %v not in expected range [%v, %v]", backoff, tt.expectedMin, tt.expectedMax)
			}
		})
	}
}

func TestShouldRetry(t *testing.T) {
	tests := []struct {
		name          string
		attemptNumber int
		maxRetries    int
		retryable     bool
		expected      bool
	}{
		{
			name:          "should retry - first attempt",
			attemptNumber: 1,
			maxRetries:    3,
			retryable:     true,
			expected:      true,
		},
		{
			name:          "should retry - second attempt",
			attemptNumber: 2,
			maxRetries:    3,
			retryable:     true,
			expected:      true,
		},
		{
			name:          "should not retry - max attempts reached",
			attemptNumber: 3,
			maxRetries:    3,
			retryable:     true,
			expected:      false,
		},
		{
			name:          "should not retry - not retryable",
			attemptNumber: 1,
			maxRetries:    3,
			retryable:     false,
			expected:      false,
		},
		{
			name:          "should not retry - exceeded max",
			attemptNumber: 4,
			maxRetries:    3,
			retryable:     true,
			expected:      false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := ShouldRetry(tt.attemptNumber, tt.maxRetries, tt.retryable)
			if result != tt.expected {
				t.Errorf("ShouldRetry() = %v, expected %v", result, tt.expected)
			}
		})
	}
}

func TestExponentialBackoffGrowth(t *testing.T) {
	// Verify that exponential backoff actually grows exponentially
	var previousBackoff time.Duration

	for attempt := 1; attempt <= 5; attempt++ {
		backoff := CalculateBackoff(attempt, types.RetryStrategyExponential)

		if attempt > 1 {
			// Each backoff should be roughly 2x the previous (accounting for jitter)
			// With 20% jitter, the ratio can be between 1.6x and 2.4x
			ratio := float64(backoff) / float64(previousBackoff)
			if ratio < 1.6 || ratio > 2.5 {
				t.Errorf("attempt %d backoff %v is not roughly 2x previous %v (ratio: %.2f)",
					attempt, backoff, previousBackoff, ratio)
			}
		}

		previousBackoff = backoff
	}
}
