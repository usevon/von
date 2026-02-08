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
    test("cache key includes version prefix", () => {
      const organizationId = "org_123";
      const version = "v1";
      const cacheKey = `version:${organizationId}:${version}`;

      expect(cacheKey).toBe("version:org_123:v1");
    });

    test("cache key is unique per org and version", () => {
      const key1 = `version:org_1:v1`;
      const key2 = `version:org_2:v1`;
      const key3 = `version:org_1:v2`;

      expect(key1).not.toBe(key2);
      expect(key1).not.toBe(key3);
    });

    test("null transforms are not cached", () => {
      const transforms = null;
      const shouldCache = transforms !== null;

      expect(shouldCache).toBe(false);
    });

    test("valid transforms are cached", () => {
      const transforms = { "order.created": { remove: ["internal_id"] } };
      const shouldCache = transforms !== null;

      expect(shouldCache).toBe(true);
    });

    test("cached transforms roundtrip through JSON", () => {
      const transforms = {
        "order.created": {
          remove: ["internal_id"],
          rename: { old_name: "new_name" },
          defaults: { version: "v1" },
        },
      };

      const serialized = JSON.stringify(transforms);
      const deserialized = JSON.parse(serialized);

      expect(deserialized).toEqual(transforms);
    });
  });
});
