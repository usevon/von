import { describe, expect, test } from "bun:test";
import {
  generateSecret,
  generateTunnelId,
  generateTunnelSecret,
} from "../../src/ids";

const HEX_REGEX = /^[a-f0-9]+$/;
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe("generateSecret", () => {
  test("uses default 'whsec' prefix", () => {
    const secret = generateSecret();
    expect(secret.startsWith("whsec_")).toBe(true);
  });

  test("uses custom prefix", () => {
    const secret = generateSecret("inbsec");
    expect(secret.startsWith("inbsec_")).toBe(true);
  });

  test("suffix is a valid UUID", () => {
    const secret = generateSecret();
    const suffix = secret.split("_")[1];
    expect(suffix).toMatch(UUID_REGEX);
  });
});

describe("generateTunnelId", () => {
  test("returns 12-character hex string", () => {
    const id = generateTunnelId("org_1", "user_1", 3000);
    expect(id).toHaveLength(12);
    expect(id).toMatch(HEX_REGEX);
  });

  test("is deterministic for same inputs", () => {
    const a = generateTunnelId("org_1", "user_1", 3000);
    const b = generateTunnelId("org_1", "user_1", 3000);
    expect(a).toBe(b);
  });

  test("different org produces different id", () => {
    const a = generateTunnelId("org_1", "user_1", 3000);
    const b = generateTunnelId("org_2", "user_1", 3000);
    expect(a).not.toBe(b);
  });

  test("different user produces different id", () => {
    const a = generateTunnelId("org_1", "user_1", 3000);
    const b = generateTunnelId("org_1", "user_2", 3000);
    expect(a).not.toBe(b);
  });

  test("different port produces different id", () => {
    const a = generateTunnelId("org_1", "user_1", 3000);
    const b = generateTunnelId("org_1", "user_1", 3001);
    expect(a).not.toBe(b);
  });
});

describe("generateTunnelSecret", () => {
  test("returns 32-character hex string", () => {
    const secret = generateTunnelSecret();
    expect(secret).toHaveLength(32);
    expect(secret).toMatch(HEX_REGEX);
  });
});
