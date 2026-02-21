import { describe, expect, test } from "bun:test";
import { generateRandomString } from "../../src/plugins/api-key/generate";

const BASE62_PATTERN = /^[a-zA-Z0-9]+$/;

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
});
