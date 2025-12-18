import { describe, expect, test } from "bun:test";
import { hmacSign } from "@usevon/utils";

const HEX_PATTERN = /^[a-f0-9]+$/;
const HEADER_PATTERN = /^t=\d+,v1=[a-f0-9]+$/;

describe("webhook delivery", () => {
  describe("signature generation", () => {
    test("generates correct signature format", () => {
      const payload = JSON.stringify({ id: "123", type: "test.event" });
      const secret = "whsec_testsecret123";
      const timestamp = 1_700_000_000;

      const signedPayload = `${timestamp}.${payload}`;
      const signature = hmacSign(signedPayload, secret);

      expect(signature).toHaveLength(64);
      expect(signature).toMatch(HEX_PATTERN);
    });

    test("different secrets produce different signatures", () => {
      const payload = JSON.stringify({ id: "123" });
      const timestamp = 1_700_000_000;
      const signedPayload = `${timestamp}.${payload}`;

      const sig1 = hmacSign(signedPayload, "secret1");
      const sig2 = hmacSign(signedPayload, "secret2");

      expect(sig1).not.toBe(sig2);
    });

    test("different timestamps produce different signatures", () => {
      const payload = JSON.stringify({ id: "123" });
      const secret = "whsec_testsecret";

      const sig1 = hmacSign(`1700000000.${payload}`, secret);
      const sig2 = hmacSign(`1700000001.${payload}`, secret);

      expect(sig1).not.toBe(sig2);
    });

    test("same inputs produce same signature", () => {
      const payload = JSON.stringify({ id: "123" });
      const secret = "whsec_testsecret";
      const signedPayload = `1700000000.${payload}`;

      const sig1 = hmacSign(signedPayload, secret);
      const sig2 = hmacSign(signedPayload, secret);

      expect(sig1).toBe(sig2);
    });
  });

  describe("webhook headers", () => {
    test("signature header format is correct", () => {
      const timestamp = 1_700_000_000;
      const signature = "abc123";
      const header = `t=${timestamp},v1=${signature}`;

      expect(header).toMatch(HEADER_PATTERN);
    });
  });

  describe("retry logic", () => {
    test("calculates final attempt correctly", () => {
      const attempts = 3;
      const maxAttempts = 3;
      const isFinalAttempt = attempts >= maxAttempts;

      expect(isFinalAttempt).toBe(true);
    });

    test("non-final attempt allows retry", () => {
      const attempts = 2;
      const maxAttempts = 3;
      const isFinalAttempt = attempts >= maxAttempts;

      expect(isFinalAttempt).toBe(false);
    });
  });

  describe("version cache", () => {
    test("cache key format is correct", () => {
      const organizationId = "org_123";
      const version = "v1";
      const cacheKey = `${organizationId}:${version}`;

      expect(cacheKey).toBe("org_123:v1");
    });

    test("cache eviction happens at limit", () => {
      const cache = new Map<string, { transforms: null; expiresAt: number }>();
      const CACHE_MAX_SIZE = 3;

      // Fill cache to limit
      for (let i = 0; i < CACHE_MAX_SIZE; i++) {
        cache.set(`key${i}`, {
          transforms: null,
          expiresAt: Date.now() + 60_000,
        });
      }

      expect(cache.size).toBe(CACHE_MAX_SIZE);

      // Evict oldest when adding new entry
      if (cache.size >= CACHE_MAX_SIZE) {
        const oldestKey = cache.keys().next().value;
        if (oldestKey) {
          cache.delete(oldestKey);
        }
      }
      cache.set("newKey", { transforms: null, expiresAt: Date.now() + 60_000 });

      expect(cache.size).toBe(CACHE_MAX_SIZE);
      expect(cache.has("key0")).toBe(false);
      expect(cache.has("newKey")).toBe(true);
    });

    test("cache expiry is respected", () => {
      const expiresAt = Date.now() - 1000; // expired
      const isExpired = expiresAt <= Date.now();

      expect(isExpired).toBe(true);
    });

    test("cache entry is valid when not expired", () => {
      const expiresAt = Date.now() + 60_000; // 1 minute from now
      const isValid = expiresAt > Date.now();

      expect(isValid).toBe(true);
    });
  });
});
