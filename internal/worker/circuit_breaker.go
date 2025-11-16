package worker

import (
	"sync"
	"time"
)

// CircuitState represents the state of a circuit breaker.
type CircuitState int

const (
	StateClosed CircuitState = iota
	StateOpen
	StateHalfOpen
)

// CircuitBreaker implements per-endpoint circuit breaker to prevent cascading failures.
type CircuitBreaker struct {
	mu                sync.RWMutex
	circuits          map[string]*endpointCircuit
	failureThreshold  int
	successThreshold  int
	timeout           time.Duration
}

// endpointCircuit tracks the state of a single endpoint's circuit.
type endpointCircuit struct {
	state            CircuitState
	consecutiveFails int
	consecutiveSucc  int
	lastFailureTime  time.Time
	lastStateChange  time.Time
}

// NewCircuitBreaker creates a circuit breaker with default thresholds.
func NewCircuitBreaker() *CircuitBreaker {
	return &CircuitBreaker{
		circuits:         make(map[string]*endpointCircuit),
		failureThreshold: 5,  // Open after 5 consecutive failures
		successThreshold: 2,  // Close after 2 consecutive successes in half-open
		timeout:          60 * time.Second,
	}
}

// IsOpen returns true if the circuit is open for the given endpoint.
func (cb *CircuitBreaker) IsOpen(endpointID string) bool {
	cb.mu.Lock()
	defer cb.mu.Unlock()

	circuit := cb.getOrCreateCircuit(endpointID)

	if circuit.state == StateOpen {
		if time.Since(circuit.lastStateChange) > cb.timeout {
			circuit.state = StateHalfOpen
			circuit.consecutiveSucc = 0
			circuit.lastStateChange = time.Now()
			return false
		}
		return true
	}

	return false
}

// RecordSuccess records a successful delivery attempt.
func (cb *CircuitBreaker) RecordSuccess(endpointID string) {
	cb.mu.Lock()
	defer cb.mu.Unlock()

	circuit := cb.getOrCreateCircuit(endpointID)
	circuit.consecutiveFails = 0

	if circuit.state == StateHalfOpen {
		circuit.consecutiveSucc++
		if circuit.consecutiveSucc >= cb.successThreshold {
			circuit.state = StateClosed
			circuit.lastStateChange = time.Now()
		}
	}
}

// RecordFailure records a failed delivery attempt.
func (cb *CircuitBreaker) RecordFailure(endpointID string) {
	cb.mu.Lock()
	defer cb.mu.Unlock()

	circuit := cb.getOrCreateCircuit(endpointID)
	circuit.consecutiveFails++
	circuit.consecutiveSucc = 0
	circuit.lastFailureTime = time.Now()

	if circuit.state == StateHalfOpen {
		circuit.state = StateOpen
		circuit.lastStateChange = time.Now()
	} else if circuit.state == StateClosed && circuit.consecutiveFails >= cb.failureThreshold {
		circuit.state = StateOpen
		circuit.lastStateChange = time.Now()
	}
}

// GetState returns the current state of the circuit for an endpoint.
func (cb *CircuitBreaker) GetState(endpointID string) CircuitState {
	cb.mu.RLock()
	defer cb.mu.RUnlock()

	circuit := cb.getOrCreateCircuit(endpointID)
	return circuit.state
}

// Reset resets the circuit breaker state for an endpoint.
func (cb *CircuitBreaker) Reset(endpointID string) {
	cb.mu.Lock()
	defer cb.mu.Unlock()

	delete(cb.circuits, endpointID)
}

// getOrCreateCircuit gets or creates a circuit for an endpoint (must be called with lock held).
func (cb *CircuitBreaker) getOrCreateCircuit(endpointID string) *endpointCircuit {
	circuit, exists := cb.circuits[endpointID]
	if !exists {
		circuit = &endpointCircuit{
			state:           StateClosed,
			lastStateChange: time.Now(),
		}
		cb.circuits[endpointID] = circuit
	}
	return circuit
}
