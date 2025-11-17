package worker

import (
	"strconv"
	"testing"

	"github.com/usevon/von/pkg/types"
)

func BenchmarkCalculateBackoffExponential(b *testing.B) {
	for i := 0; i < b.N; i++ {
		_ = CalculateBackoff(3, types.RetryStrategyExponential)
	}
}

func BenchmarkCalculateBackoffLinear(b *testing.B) {
	for i := 0; i < b.N; i++ {
		_ = CalculateBackoff(3, types.RetryStrategyLinear)
	}
}

func BenchmarkCalculateBackoffConstant(b *testing.B) {
	for i := 0; i < b.N; i++ {
		_ = CalculateBackoff(3, types.RetryStrategyConstant)
	}
}

func BenchmarkShouldRetry(b *testing.B) {
	for i := 0; i < b.N; i++ {
		_ = ShouldRetry(2, 5, true)
	}
}

// BenchmarkExponentialBackoff benchmarks the exponential backoff calculation.
func BenchmarkExponentialBackoff(b *testing.B) {
	for i := 0; i < b.N; i++ {
		_ = exponentialBackoff(5)
	}
}

// BenchmarkLinearBackoff benchmarks the linear backoff calculation.
func BenchmarkLinearBackoff(b *testing.B) {
	for i := 0; i < b.N; i++ {
		_ = linearBackoff(5)
	}
}

// BenchmarkConstantBackoff benchmarks the constant backoff calculation.
func BenchmarkConstantBackoff(b *testing.B) {
	for i := 0; i < b.N; i++ {
		_ = constantBackoff()
	}
}

// BenchmarkCalculateBackoffVariousAttempts benchmarks backoff calculation across different attempt numbers.
func BenchmarkCalculateBackoffVariousAttempts(b *testing.B) {
	attempts := []int{1, 3, 5, 10, 20}

	for _, attempt := range attempts {
		b.Run(strconv.Itoa(attempt), func(b *testing.B) {
			for i := 0; i < b.N; i++ {
				_ = CalculateBackoff(attempt, types.RetryStrategyExponential)
			}
		})
	}
}
