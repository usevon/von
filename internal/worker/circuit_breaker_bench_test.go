package worker

import (
	"sync"
	"testing"
)

func BenchmarkCBIsOpen(b *testing.B) {
	cb := NewCircuitBreaker()
	endpointID := "test-endpoint"

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = cb.IsOpen(endpointID)
	}
}

func BenchmarkCBRecordSuccess(b *testing.B) {
	cb := NewCircuitBreaker()
	endpointID := "test-endpoint"

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		cb.RecordSuccess(endpointID)
	}
}

func BenchmarkCBRecordFailure(b *testing.B) {
	cb := NewCircuitBreaker()
	endpointID := "test-endpoint"

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		cb.RecordFailure(endpointID)
	}
}

func BenchmarkCBGetState(b *testing.B) {
	cb := NewCircuitBreaker()
	endpointID := "test-endpoint"

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = cb.GetState(endpointID)
	}
}

func BenchmarkCBReset(b *testing.B) {
	cb := NewCircuitBreaker()
	endpointID := "test-endpoint"

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		cb.Reset(endpointID)
	}
}

// BenchmarkCBConcurrentIsOpen benchmarks concurrent IsOpen calls.
// This tests lock contention under read-heavy load.
func BenchmarkCBConcurrentIsOpen(b *testing.B) {
	cb := NewCircuitBreaker()
	endpointID := "test-endpoint"

	b.ResetTimer()
	b.RunParallel(func(pb *testing.PB) {
		for pb.Next() {
			_ = cb.IsOpen(endpointID)
		}
	})
}

// BenchmarkCBConcurrentRecordSuccess benchmarks concurrent RecordSuccess calls.
// This tests lock contention under write-heavy load.
func BenchmarkCBConcurrentRecordSuccess(b *testing.B) {
	cb := NewCircuitBreaker()
	endpointID := "test-endpoint"

	b.ResetTimer()
	b.RunParallel(func(pb *testing.PB) {
		for pb.Next() {
			cb.RecordSuccess(endpointID)
		}
	})
}

// BenchmarkCBConcurrentRecordFailure benchmarks concurrent RecordFailure calls.
func BenchmarkCBConcurrentRecordFailure(b *testing.B) {
	cb := NewCircuitBreaker()
	endpointID := "test-endpoint"

	b.ResetTimer()
	b.RunParallel(func(pb *testing.PB) {
		for pb.Next() {
			cb.RecordFailure(endpointID)
		}
	})
}

// BenchmarkCBConcurrentMixed benchmarks mixed read/write operations.
// This simulates realistic concurrent access patterns.
func BenchmarkCBConcurrentMixed(b *testing.B) {
	cb := NewCircuitBreaker()
	endpointID := "test-endpoint"

	b.ResetTimer()
	b.RunParallel(func(pb *testing.PB) {
		i := 0
		for pb.Next() {
			switch i % 3 {
			case 0:
				_ = cb.IsOpen(endpointID)
			case 1:
				cb.RecordSuccess(endpointID)
			case 2:
				cb.RecordFailure(endpointID)
			}
			i++
		}
	})
}

// BenchmarkCBMultipleEndpoints benchmarks operations across multiple endpoints.
func BenchmarkCBMultipleEndpoints(b *testing.B) {
	cb := NewCircuitBreaker()
	endpoints := []string{"endpoint-1", "endpoint-2", "endpoint-3", "endpoint-4", "endpoint-5"}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		endpointID := endpoints[i%len(endpoints)]
		_ = cb.IsOpen(endpointID)
	}
}

// BenchmarkCBStateTransitions benchmarks circuit state transitions.
func BenchmarkCBStateTransitions(b *testing.B) {
	endpointID := "test-endpoint"

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		cb := NewCircuitBreaker()

		// Transition to open
		for j := 0; j < 5; j++ {
			cb.RecordFailure(endpointID)
		}

		// Transition to half-open
		_ = cb.IsOpen(endpointID)

		// Transition to closed
		for j := 0; j < 2; j++ {
			cb.RecordSuccess(endpointID)
		}
	}
}

// BenchmarkCBConcurrentMultiEndpoints benchmarks concurrent access to multiple endpoints.
func BenchmarkCBConcurrentMultiEndpoints(b *testing.B) {
	cb := NewCircuitBreaker()
	endpoints := []string{"endpoint-1", "endpoint-2", "endpoint-3", "endpoint-4", "endpoint-5"}

	b.ResetTimer()
	b.RunParallel(func(pb *testing.PB) {
		i := 0
		for pb.Next() {
			endpointID := endpoints[i%len(endpoints)]
			_ = cb.IsOpen(endpointID)
			i++
		}
	})
}

// BenchmarkCBHighContention benchmarks high lock contention scenarios.
// Multiple goroutines hitting the same endpoint simultaneously.
func BenchmarkCBHighContention(b *testing.B) {
	cb := NewCircuitBreaker()
	endpointID := "test-endpoint"
	numGoroutines := 100

	b.ResetTimer()
	var wg sync.WaitGroup
	for i := 0; i < b.N; i++ {
		wg.Add(numGoroutines)
		for j := 0; j < numGoroutines; j++ {
			go func() {
				defer wg.Done()
				_ = cb.IsOpen(endpointID)
			}()
		}
		wg.Wait()
	}
}
