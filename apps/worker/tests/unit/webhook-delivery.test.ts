import { describe, expect, test } from "bun:test";
import { buildSignatureHeader, hmacSign } from "@usevon/utils";

const HEADER_PATTERN = /^t=\d+,v1=[a-f0-9]+$/;
const DUAL_HEADER_PATTERN = /^t=\d+,v1=[a-f0-9]+,v2=[a-f0-9]+$/;

describe("dual-hash signature", () => {
  test("single secret produces v1 only", () => {
    const timestamp = 1_700_000_000;
    const signedPayload = `${timestamp}.{"test":true}`;
    const header = buildSignatureHeader(
      timestamp,
      signedPayload,
      "whsec_new"
    );

    expect(header).toMatch(HEADER_PATTERN);
    expect(header).not.toContain("v2=");
  });

  test("dual secrets produce v1 and v2", () => {
    const timestamp = 1_700_000_000;
    const signedPayload = `${timestamp}.{"test":true}`;
    const header = buildSignatureHeader(
      timestamp,
      signedPayload,
      "whsec_new",
      "whsec_old"
    );

    expect(header).toMatch(DUAL_HEADER_PATTERN);
  });

  test("v1 uses new secret, v2 uses old secret", () => {
    const timestamp = 1_700_000_000;
    const signedPayload = `${timestamp}.{"test":true}`;
    const newSecret = "whsec_new";
    const oldSecret = "whsec_old";

    const header = buildSignatureHeader(
      timestamp,
      signedPayload,
      newSecret,
      oldSecret
    );
    const v1Sig = hmacSign(signedPayload, newSecret);
    const v2Sig = hmacSign(signedPayload, oldSecret);

    expect(header).toBe(`t=${timestamp},v1=${v1Sig},v2=${v2Sig}`);
  });

  test("null previousSecret produces single signature", () => {
    const timestamp = 1_700_000_000;
    const signedPayload = `${timestamp}.{"test":true}`;
    const header = buildSignatureHeader(
      timestamp,
      signedPayload,
      "whsec_new",
      null
    );

    expect(header).toMatch(HEADER_PATTERN);
    expect(header).not.toContain("v2=");
  });
});
