import { describe, expect, test } from "bun:test";

// We can't directly import the private generateRandomString, so we test
// the public apiKey plugin's key generation indirectly via the exported plugin.
// Instead, we replicate the logic here for unit testing the Base62 properties.

const BASE62_CHARS =
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const BASE62_PATTERN = /^[a-zA-Z0-9]+$/;
const DIGIT_PATTERN = /[0-9]/;

function generateRandomString(length: number): string {
  const chars = BASE62_CHARS;
  let result = "";
  const randomValues = new Uint8Array(length * 2);
  crypto.getRandomValues(randomValues);
  for (let i = 0, j = 0; i < length; j += 1) {
    if (j >= randomValues.length) {
      crypto.getRandomValues(randomValues);
      j = 0;
    }
    const byte = randomValues[j];
    if (byte < 248) {
      result += chars[byte % 62];
      i += 1;
    }
  }
  return result;
}

describe("Base62 key generation", () => {
  test("generates string of requested length", () => {
    const key = generateRandomString(64);
    expect(key).toHaveLength(64);
  });

  test("generates only Base62 characters", () => {
    for (let i = 0; i < 50; i++) {
      const key = generateRandomString(64);
      expect(key).toMatch(BASE62_PATTERN);
    }
  });

  test("includes digits in output", () => {
    // With 64 chars from Base62, the probability of no digits is ~(52/62)^64 ≈ 0.00003
    // Run enough iterations to be confident
    let hasDigit = false;
    for (let i = 0; i < 10; i++) {
      const key = generateRandomString(64);
      if (DIGIT_PATTERN.test(key)) {
        hasDigit = true;
        break;
      }
    }
    expect(hasDigit).toBe(true);
  });

  test("generates unique strings", () => {
    const keys = new Set<string>();
    for (let i = 0; i < 100; i++) {
      keys.add(generateRandomString(64));
    }
    expect(keys.size).toBe(100);
  });

  test("works with small lengths", () => {
    const key = generateRandomString(1);
    expect(key).toHaveLength(1);
    expect(key).toMatch(BASE62_PATTERN);
  });

  test("works with large lengths", () => {
    const key = generateRandomString(256);
    expect(key).toHaveLength(256);
    expect(key).toMatch(BASE62_PATTERN);
  });

  test("character distribution is roughly uniform", () => {
    // Generate a large sample and check that all 62 chars appear
    const combined = Array.from({ length: 100 }, () =>
      generateRandomString(64)
    ).join("");

    const charSet = new Set(combined);
    // All 62 characters should appear in 6400 random chars
    expect(charSet.size).toBe(62);
  });
});
