package worker

import (
	"sync"
	"testing"
	"time"
)

func TestCircuitBreaker_InitialState(t *testing.T) {
	cb := NewCircuitBreaker()

	if cb.IsOpen("endpoint-1") {
		t.Error("circuit should be closed initially")
	}

	if cb.GetState("endpoint-1") != StateClosed {
		t.Errorf("expected StateClosed, got %v", cb.GetState("endpoint-1"))
	}
}

func TestCircuitBreaker_OpenAfterFailures(t *testing.T) {
	cb := NewCircuitBreaker()
	endpointID := "endpoint-1"

	for i := 0; i < cb.failureThreshold-1; i++ {
		cb.RecordFailure(endpointID)
		if cb.IsOpen(endpointID) {
			t.Errorf("circuit opened too early after %d failures", i+1)
		}
	}

	cb.RecordFailure(endpointID)

	if !cb.IsOpen(endpointID) {
		t.Error("circuit should be open after reaching failure threshold")
	}

	if cb.GetState(endpointID) != StateOpen {
		t.Errorf("expected StateOpen, got %v", cb.GetState(endpointID))
	}
}

func TestCircuitBreaker_HalfOpenAfterTimeout(t *testing.T) {
	cb := NewCircuitBreaker()
	cb.timeout = 100 * time.Millisecond
	endpointID := "endpoint-1"

	for i := 0; i < cb.failureThreshold; i++ {
		cb.RecordFailure(endpointID)
	}

	if !cb.IsOpen(endpointID) {
		t.Error("circuit should be open")
	}

	time.Sleep(150 * time.Millisecond)

	if cb.IsOpen(endpointID) {
		t.Error("circuit should transition to half-open after timeout")
	}

	if cb.GetState(endpointID) != StateHalfOpen {
		t.Errorf("expected StateHalfOpen, got %v", cb.GetState(endpointID))
	}
}

func TestCircuitBreaker_CloseAfterSuccesses(t *testing.T) {
	cb := NewCircuitBreaker()
	cb.timeout = 50 * time.Millisecond
	endpointID := "endpoint-1"

	for i := 0; i < cb.failureThreshold; i++ {
		cb.RecordFailure(endpointID)
	}

	time.Sleep(100 * time.Millisecond)
	cb.IsOpen(endpointID)

	if cb.GetState(endpointID) != StateHalfOpen {
		t.Error("circuit should be in half-open state")
	}

	for i := 0; i < cb.successThreshold; i++ {
		cb.RecordSuccess(endpointID)
	}

	if cb.GetState(endpointID) != StateClosed {
		t.Errorf("expected StateClosed after successes, got %v", cb.GetState(endpointID))
	}
}

func TestCircuitBreaker_ReopenFromHalfOpen(t *testing.T) {
	cb := NewCircuitBreaker()
	cb.timeout = 50 * time.Millisecond
	endpointID := "endpoint-1"

	for i := 0; i < cb.failureThreshold; i++ {
		cb.RecordFailure(endpointID)
	}

	time.Sleep(100 * time.Millisecond)
	cb.IsOpen(endpointID)

	if cb.GetState(endpointID) != StateHalfOpen {
		t.Error("circuit should be in half-open state")
	}

	cb.RecordFailure(endpointID)

	if cb.GetState(endpointID) != StateOpen {
		t.Errorf("expected StateOpen after failure in half-open, got %v", cb.GetState(endpointID))
	}
}

func TestCircuitBreaker_SuccessResetsFailures(t *testing.T) {
	cb := NewCircuitBreaker()
	endpointID := "endpoint-1"

	for i := 0; i < cb.failureThreshold-1; i++ {
		cb.RecordFailure(endpointID)
	}

	cb.RecordSuccess(endpointID)

	for i := 0; i < cb.failureThreshold-1; i++ {
		cb.RecordFailure(endpointID)
		if cb.IsOpen(endpointID) {
			t.Error("circuit should not open, failures were reset by success")
		}
	}
}

func TestCircuitBreaker_MultipleEndpoints(t *testing.T) {
	cb := NewCircuitBreaker()

	for i := 0; i < cb.failureThreshold; i++ {
		cb.RecordFailure("endpoint-1")
	}

	cb.RecordSuccess("endpoint-2")

	if !cb.IsOpen("endpoint-1") {
		t.Error("endpoint-1 circuit should be open")
	}

	if cb.IsOpen("endpoint-2") {
		t.Error("endpoint-2 circuit should be closed")
	}
}

func TestCircuitBreaker_Reset(t *testing.T) {
	cb := NewCircuitBreaker()
	endpointID := "endpoint-1"

	for i := 0; i < cb.failureThreshold; i++ {
		cb.RecordFailure(endpointID)
	}

	if !cb.IsOpen(endpointID) {
		t.Error("circuit should be open")
	}

	cb.Reset(endpointID)

	if cb.IsOpen(endpointID) {
		t.Error("circuit should be closed after reset")
	}

	if cb.GetState(endpointID) != StateClosed {
		t.Errorf("expected StateClosed after reset, got %v", cb.GetState(endpointID))
	}
}

func TestCircuitBreaker_Concurrent(t *testing.T) {
	cb := NewCircuitBreaker()
	endpointID := "endpoint-1"

	var wg sync.WaitGroup

	for i := 0; i < 10; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for j := 0; j < 10; j++ {
				cb.RecordFailure(endpointID)
				cb.IsOpen(endpointID)
				cb.GetState(endpointID)
			}
		}()
	}

	wg.Wait()

	if !cb.IsOpen(endpointID) {
		t.Error("circuit should be open after concurrent failures")
	}
}
