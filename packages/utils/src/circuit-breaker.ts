export const CIRCUIT_CONFIG = {
  failureThreshold: 5,
  resetTimeoutMs: 300_000, // 5 minutes
};

export type CircuitState = "open" | "closed" | "half_open";

export type CircuitBreakerState = {
  circuitState: CircuitState;
  circuitOpenedAt: Date | null;
  failureCount: number;
};

export function isCircuitOpen(state: CircuitBreakerState): boolean {
  if (state.circuitState !== "open") {
    return false;
  }
  if (!state.circuitOpenedAt) {
    return false;
  }

  const timeSinceOpen = Date.now() - state.circuitOpenedAt.getTime();
  return timeSinceOpen < CIRCUIT_CONFIG.resetTimeoutMs;
}

export function shouldTransitionToHalfOpen(
  state: CircuitBreakerState
): boolean {
  if (state.circuitState !== "open") {
    return false;
  }
  if (!state.circuitOpenedAt) {
    return false;
  }

  const timeSinceOpen = Date.now() - state.circuitOpenedAt.getTime();
  return timeSinceOpen >= CIRCUIT_CONFIG.resetTimeoutMs;
}

export function getSuccessUpdate(): {
  circuitState: CircuitState;
  failureCount: number;
} {
  return {
    circuitState: "closed",
    failureCount: 0,
  };
}

export function getFailureUpdate(currentFailureCount: number): {
  circuitState: CircuitState;
  failureCount: number;
  shouldOpenCircuit: boolean;
} {
  const newFailureCount = currentFailureCount + 1;
  const shouldOpenCircuit = newFailureCount >= CIRCUIT_CONFIG.failureThreshold;

  return {
    circuitState: shouldOpenCircuit ? "open" : "closed",
    failureCount: newFailureCount,
    shouldOpenCircuit,
  };
}
