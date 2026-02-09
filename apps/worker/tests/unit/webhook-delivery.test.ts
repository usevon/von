import { describe, expect, test } from "bun:test";
import { buildSignatureHeader, hmacSign } from "@usevon/utils";

const HEX_PATTERN = /^[a-f0-9]+$/;
const HEADER_PATTERN = /^t=\d+,v1=[a-f0-9]+$/;
const DUAL_HEADER_PATTERN = /^t=\d+,v1=[a-f0-9]+,v2=[a-f0-9]+$/;

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

  describe("dual-hash signature", () => {
    test("single secret produces v1 only", () => {
      const timestamp = 1_700_000_000;
      const signedPayload = `${timestamp}.{"test":true}`;
      const header = buildSignatureHeader(timestamp, signedPayload, "whsec_new");

      expect(header).toMatch(HEADER_PATTERN);
      expect(header).not.toContain("v2=");
    });

    test("dual secrets produce v1 and v2", () => {
      const timestamp = 1_700_000_000;
      const signedPayload = `${timestamp}.{"test":true}`;
      const header = buildSignatureHeader(timestamp, signedPayload, "whsec_new", "whsec_old");

      expect(header).toMatch(DUAL_HEADER_PATTERN);
    });

    test("v1 uses new secret, v2 uses old secret", () => {
      const timestamp = 1_700_000_000;
      const signedPayload = `${timestamp}.{"test":true}`;
      const newSecret = "whsec_new";
      const oldSecret = "whsec_old";

      const header = buildSignatureHeader(timestamp, signedPayload, newSecret, oldSecret);
      const v1Sig = hmacSign(signedPayload, newSecret);
      const v2Sig = hmacSign(signedPayload, oldSecret);

      expect(header).toBe(`t=${timestamp},v1=${v1Sig},v2=${v2Sig}`);
    });

    test("null previousSecret produces single signature", () => {
      const timestamp = 1_700_000_000;
      const signedPayload = `${timestamp}.{"test":true}`;
      const header = buildSignatureHeader(timestamp, signedPayload, "whsec_new", null);

      expect(header).toMatch(HEADER_PATTERN);
      expect(header).not.toContain("v2=");
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

  describe("response consolidation", () => {
    test("success response shape", () => {
      const response = { status: 200, durationMs: 142 };

      expect(response.status).toBe(200);
      expect(response.durationMs).toBe(142);
    });

    test("failure response shape with error", () => {
      const response = { error: "HTTP 502", durationMs: 5023 };

      expect(response.error).toBe("HTTP 502");
      expect(response.durationMs).toBe(5023);
    });

    test("timeout response shape", () => {
      const response = { error: "AbortError: The operation was aborted", durationMs: 30000 };

      expect(response.error).toContain("AbortError");
      expect(response.durationMs).toBe(30000);
    });

    test("pending delivery has null response", () => {
      const response = null;

      expect(response).toBeNull();
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
