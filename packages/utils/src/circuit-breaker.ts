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
  if (state.circuitState !== "open" || !state.circuitOpenedAt) return null;
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
} {
  return {
    circuitState: "closed",
    failureCount: 0,
  };
}
