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

function getElapsedSinceOpen(state: CircuitBreakerState): number | null {
  if (state.circuitState !== "open" || !state.circuitOpenedAt) {
    return null;
  }
  return Date.now() - state.circuitOpenedAt.getTime();
}

export function isCircuitOpen(state: CircuitBreakerState): boolean {
  const elapsed = getElapsedSinceOpen(state);
  return elapsed !== null && elapsed < CIRCUIT_CONFIG.resetTimeoutMs;
}

export function shouldTransitionToHalfOpen(
  state: CircuitBreakerState
): boolean {
  const elapsed = getElapsedSinceOpen(state);
  return elapsed !== null && elapsed >= CIRCUIT_CONFIG.resetTimeoutMs;
}

export function getSuccessUpdate(): {
  circuitState: CircuitState;
  failureCount: number;
  circuitOpenedAt: null;
} {
  return {
    circuitState: "closed",
    failureCount: 0,
    circuitOpenedAt: null,
  };
}

export function getFailureUpdate(current: CircuitBreakerState): {
  circuitState: CircuitState;
  failureCount: number;
  circuitOpenedAt: Date | null;
} {
  const failureCount = current.failureCount + 1;
  const willOpen =
    failureCount >= CIRCUIT_CONFIG.failureThreshold &&
    current.circuitState !== "open";

  return {
    failureCount,
    circuitState: willOpen ? "open" : current.circuitState,
    circuitOpenedAt: willOpen ? new Date() : current.circuitOpenedAt,
  };
}
