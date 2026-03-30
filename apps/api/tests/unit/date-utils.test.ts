import { describe, expect, test } from "bun:test";
import {
  parseOptionalDate,
  validateDateRange,
} from "../../src/lib/date-utils";

describe("parseOptionalDate", () => {
  test("returns null for undefined", () => {
    expect(parseOptionalDate(undefined, "from")).toBeNull();
  });

  test("returns null for empty string", () => {
    expect(parseOptionalDate("", "from")).toBeNull();
  });

  test("parses valid ISO date", () => {
    const result = parseOptionalDate("2026-01-15T00:00:00Z", "from");
    expect(result).toBeInstanceOf(Date);
    expect(result?.toISOString()).toBe("2026-01-15T00:00:00.000Z");
  });

  test("parses date-only string", () => {
    const result = parseOptionalDate("2026-03-01", "to");
    expect(result).toBeInstanceOf(Date);
  });

  test("throws BadRequestError for invalid date", () => {
    expect(() => parseOptionalDate("not-a-date", "from")).toThrow(
      "Invalid from date"
    );
  });

  test("throws BadRequestError for garbage input", () => {
    expect(() => parseOptionalDate("abc123", "to")).toThrow("Invalid to date");
  });
});

describe("validateDateRange", () => {
  test("does not throw when from is before to", () => {
    const from = new Date("2026-01-01");
    const to = new Date("2026-01-31");
    expect(() => validateDateRange(from, to)).not.toThrow();
  });

  test("does not throw when from equals to", () => {
    const date = new Date("2026-01-15");
    expect(() => validateDateRange(date, date)).not.toThrow();
  });

  test("does not throw when from is null", () => {
    expect(() => validateDateRange(null, new Date())).not.toThrow();
  });

  test("does not throw when to is null", () => {
    expect(() => validateDateRange(new Date(), null)).not.toThrow();
  });

  test("does not throw when both are null", () => {
    expect(() => validateDateRange(null, null)).not.toThrow();
  });

  test("throws when from is after to", () => {
    const from = new Date("2026-02-01");
    const to = new Date("2026-01-01");
    expect(() => validateDateRange(from, to)).toThrow(
      "from must be before or equal to to"
    );
  });
});
