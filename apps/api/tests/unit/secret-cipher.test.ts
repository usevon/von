import { describe, expect, test } from "bun:test";
import {
  decryptOptionalSecret,
  decryptSecret,
  encryptSecret,
} from "../../src/lib/secret-cipher";

describe("secret cipher", () => {
  test("encryptSecret prefixes encrypted values", () => {
    const encrypted = encryptSecret("whsec_demo_secret");

    expect(encrypted.startsWith("enc:v1:")).toBe(true);
    expect(encrypted).not.toBe("whsec_demo_secret");
  });

  test("decryptSecret returns original plaintext for encrypted values", () => {
    const encrypted = encryptSecret("whsec_demo_secret");

    expect(decryptSecret(encrypted)).toBe("whsec_demo_secret");
  });

  test("decryptSecret preserves legacy plaintext", () => {
    expect(decryptSecret("legacy_plain_secret")).toBe("legacy_plain_secret");
  });

  test("decryptOptionalSecret preserves null and undefined", () => {
    expect(decryptOptionalSecret(null)).toBeNull();
    expect(decryptOptionalSecret(undefined)).toBeUndefined();
  });
});
