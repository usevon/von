import { describe, expect, test } from "bun:test";
import {
  createExponentialRetryStrategy,
  createLinearRetryStrategy,
  createRetryStrategy,
} from "../../src/fetch/retry";

describe("Retry Strategies", () => {
  describe("createLinearRetryStrategy", () => {
    test("returns fixed delay regardless of attempt", () => {
      const strategy = createLinearRetryStrategy({
        type: "linear",
        attempts: 3,
        delay: 1000,
      });

      expect(strategy.getDelay(0)).toBe(1000);
      expect(strategy.getDelay(1)).toBe(1000);
      expect(strategy.getDelay(2)).toBe(1000);
    });

    test("allows retry when under max attempts (attempts = total tries)", async () => {
      const strategy = createLinearRetryStrategy({
        type: "linear",
        attempts: 3,
        delay: 1000,
      });

      expect(await strategy.shouldAttemptRetry(0, null)).toBe(true);
      expect(await strategy.shouldAttemptRetry(1, null)).toBe(true);
      expect(await strategy.shouldAttemptRetry(2, null)).toBe(false);
    });

    test("retries on 5xx errors by default", async () => {
      const strategy = createLinearRetryStrategy({
        type: "linear",
        attempts: 3,
        delay: 1000,
      });

      const response500 = new Response(null, { status: 500 });
      const response429 = new Response(null, { status: 429 });
      const response400 = new Response(null, { status: 400 });
      const response200 = new Response(null, { status: 200 });

      expect(await strategy.shouldAttemptRetry(0, response500)).toBe(true);
      expect(await strategy.shouldAttemptRetry(0, response429)).toBe(true);
      expect(await strategy.shouldAttemptRetry(0, response400)).toBe(false);
      expect(await strategy.shouldAttemptRetry(0, response200)).toBe(false);
    });

    test("uses custom shouldRetry function", async () => {
      const strategy = createLinearRetryStrategy({
        type: "linear",
        attempts: 3,
        delay: 1000,
        shouldRetry: (response) => response?.status === 418,
      });

      const response418 = new Response(null, { status: 418 });
      const response500 = new Response(null, { status: 500 });

      expect(await strategy.shouldAttemptRetry(0, response418)).toBe(true);
      expect(await strategy.shouldAttemptRetry(0, response500)).toBe(false);
    });
  });

  describe("createExponentialRetryStrategy", () => {
    test("returns exponentially increasing delay", () => {
      const strategy = createExponentialRetryStrategy({
        type: "exponential",
        attempts: 5,
        baseDelay: 1000,
        maxDelay: 30_000,
      });

      expect(strategy.getDelay(0)).toBe(1000);
      expect(strategy.getDelay(1)).toBe(2000);
      expect(strategy.getDelay(2)).toBe(4000);
      expect(strategy.getDelay(3)).toBe(8000);
      expect(strategy.getDelay(4)).toBe(16_000);
    });

    test("caps delay at maxDelay", () => {
      const strategy = createExponentialRetryStrategy({
        type: "exponential",
        attempts: 5,
        baseDelay: 1000,
        maxDelay: 5000,
      });

      expect(strategy.getDelay(0)).toBe(1000);
      expect(strategy.getDelay(1)).toBe(2000);
      expect(strategy.getDelay(2)).toBe(4000);
      expect(strategy.getDelay(3)).toBe(5000);
      expect(strategy.getDelay(4)).toBe(5000);
    });

    test("allows retry when under max attempts (attempts = total tries)", async () => {
      const strategy = createExponentialRetryStrategy({
        type: "exponential",
        attempts: 3,
        baseDelay: 1000,
        maxDelay: 10_000,
      });

      expect(await strategy.shouldAttemptRetry(0, null)).toBe(true);
      expect(await strategy.shouldAttemptRetry(1, null)).toBe(true);
      expect(await strategy.shouldAttemptRetry(2, null)).toBe(false);
    });
  });

  describe("createRetryStrategy", () => {
    test("creates linear strategy from number", () => {
      const strategy = createRetryStrategy(3);

      expect(strategy.getDelay(0)).toBe(1000);
      expect(strategy.getDelay(1)).toBe(1000);
    });

    test("creates linear strategy from options", () => {
      const strategy = createRetryStrategy({
        type: "linear",
        attempts: 3,
        delay: 500,
      });

      expect(strategy.getDelay(0)).toBe(500);
    });

    test("creates exponential strategy from options", () => {
      const strategy = createRetryStrategy({
        type: "exponential",
        attempts: 3,
        baseDelay: 1000,
        maxDelay: 10_000,
      });

      expect(strategy.getDelay(0)).toBe(1000);
      expect(strategy.getDelay(1)).toBe(2000);
    });
  });
});
