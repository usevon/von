import { describe, expect, test } from "bun:test";
import { assertSafeWebhookUrl } from "../../src/lib/url-safety";

describe("assertSafeWebhookUrl", () => {
  test("allows valid HTTPS URL", async () => {
    await expect(
      assertSafeWebhookUrl("https://example.com/webhook", "bad url")
    ).resolves.toBeUndefined();
  });

  test("allows valid HTTP URL", async () => {
    await expect(
      assertSafeWebhookUrl("http://example.com/webhook", "bad url")
    ).resolves.toBeUndefined();
  });

  test("throws for localhost", async () => {
    await expect(
      assertSafeWebhookUrl("http://localhost/webhook", "bad url")
    ).rejects.toThrow("bad url");
  });

  test("throws for private IP", async () => {
    await expect(
      assertSafeWebhookUrl("http://192.168.1.1/webhook", "bad url")
    ).rejects.toThrow("bad url");
  });

  test("throws for 127.0.0.1", async () => {
    await expect(
      assertSafeWebhookUrl("http://127.0.0.1/webhook", "bad url")
    ).rejects.toThrow("bad url");
  });

  test("throws for non-http protocol", async () => {
    await expect(
      assertSafeWebhookUrl("ftp://example.com/file", "bad url")
    ).rejects.toThrow("bad url");
  });

  test("uses custom error message", async () => {
    await expect(
      assertSafeWebhookUrl("http://10.0.0.1/hook", "Custom error message")
    ).rejects.toThrow("Custom error message");
  });
});
