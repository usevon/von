import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  CIRCUIT_CONFIG,
  type CircuitBreakerState,
  getSuccessUpdate,
  isCircuitOpen,
  shouldTransitionToHalfOpen,
} from "../../src/circuit-breaker";

describe("circuit-breaker", () => {
  let originalDateNow: () => number;
  let mockNow: number;

  beforeEach(() => {
    originalDateNow = Date.now;
    mockNow = 1_700_000_000_000;
    Date.now = () => mockNow;
  });

  afterEach(() => {
    Date.now = originalDateNow;
  });

  describe("isCircuitOpen", () => {
    test("returns false when state is closed", () => {
      const state: CircuitBreakerState = {
        circuitState: "closed",
        circuitOpenedAt: null,
        failureCount: 0,
      };
      expect(isCircuitOpen(state)).toBe(false);
    });

    test("returns false when state is half_open", () => {
      const state: CircuitBreakerState = {
        circuitState: "half_open",
        circuitOpenedAt: new Date(mockNow - 100_000),
        failureCount: 5,
      };
      expect(isCircuitOpen(state)).toBe(false);
    });

    test("returns true when open and within timeout", () => {
      const state: CircuitBreakerState = {
        circuitState: "open",
        circuitOpenedAt: new Date(mockNow - 60_000), // 1 minute ago
        failureCount: 5,
      };
      expect(isCircuitOpen(state)).toBe(true);
    });

    test("returns false when open but timeout expired", () => {
      const state: CircuitBreakerState = {
        circuitState: "open",
        circuitOpenedAt: new Date(
          mockNow - CIRCUIT_CONFIG.resetTimeoutMs - 1000
        ),
        failureCount: 5,
      };
      expect(isCircuitOpen(state)).toBe(false);
    });

    test("returns false when open but no circuitOpenedAt", () => {
      const state: CircuitBreakerState = {
        circuitState: "open",
        circuitOpenedAt: null,
        failureCount: 5,
      };
      expect(isCircuitOpen(state)).toBe(false);
    });
  });

  describe("shouldTransitionToHalfOpen", () => {
    test("returns false when state is closed", () => {
      const state: CircuitBreakerState = {
        circuitState: "closed",
        circuitOpenedAt: null,
        failureCount: 0,
      };
      expect(shouldTransitionToHalfOpen(state)).toBe(false);
    });

    test("returns false when state is half_open", () => {
      const state: CircuitBreakerState = {
        circuitState: "half_open",
        circuitOpenedAt: new Date(
          mockNow - CIRCUIT_CONFIG.resetTimeoutMs - 1000
        ),
        failureCount: 5,
      };
      expect(shouldTransitionToHalfOpen(state)).toBe(false);
    });

    test("returns false when open but within timeout", () => {
      const state: CircuitBreakerState = {
        circuitState: "open",
        circuitOpenedAt: new Date(mockNow - 60_000), // 1 minute ago
        failureCount: 5,
      };
      expect(shouldTransitionToHalfOpen(state)).toBe(false);
    });

    test("returns true when open and timeout expired", () => {
      const state: CircuitBreakerState = {
        circuitState: "open",
        circuitOpenedAt: new Date(
          mockNow - CIRCUIT_CONFIG.resetTimeoutMs - 1000
        ),
        failureCount: 5,
      };
      expect(shouldTransitionToHalfOpen(state)).toBe(true);
    });

    test("returns false when open but no circuitOpenedAt", () => {
      const state: CircuitBreakerState = {
        circuitState: "open",
        circuitOpenedAt: null,
        failureCount: 5,
      };
      expect(shouldTransitionToHalfOpen(state)).toBe(false);
    });
  });

  describe("getSuccessUpdate", () => {
    test("resets to closed with 0 failures", () => {
      const result = getSuccessUpdate();
      expect(result.circuitState).toBe("closed");
      expect(result.failureCount).toBe(0);
    });
  });
});
