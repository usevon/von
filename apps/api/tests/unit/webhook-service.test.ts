import { describe, expect, test } from "bun:test";
import { WebhookService } from "../../src/modules/webhooks/service";

describe("WebhookService", () => {
  describe("createEvent", () => {
    test("rejects payload exceeding max body size", async () => {
      const largePayload = { data: "x".repeat(1_100_000) };
      await expect(
        WebhookService.createEvent({
          organizationId: "00000000-0000-0000-0000-000000000001",
          plan: "hobby",
          eventType: "test.event",
          payload: largePayload,
        })
      ).rejects.toThrow("byte limit");
    });
  });

  describe("createBatch", () => {
    test("rejects batch with oversized payload", async () => {
      const largePayload = { data: "x".repeat(1_100_000) };
      await expect(
        WebhookService.createBatch({
          organizationId: "00000000-0000-0000-0000-000000000001",
          plan: "hobby",
          events: [
            { eventType: "test.event", payload: largePayload },
          ],
        })
      ).rejects.toThrow("byte limit");
    });

    test("returns empty batch when no events provided", async () => {
      const result = await WebhookService.createBatch({
        organizationId: "00000000-0000-0000-0000-000000000001",
        plan: "hobby",
        events: [],
      });
      expect(result.created).toBe(0);
      expect(result.events).toEqual([]);
    });
  });

  describe("getEvent", () => {
    test("returns null for nonexistent event", async () => {
      const result = await WebhookService.getEvent(
        "00000000-0000-0000-0000-000000000001",
        "00000000-0000-0000-0000-0000000000cc"
      );
      expect(result).toBeNull();
    });
  });

  describe("getEvents", () => {
    test("returns empty list for org with no events", async () => {
      const result = await WebhookService.getEvents("00000000-0000-0000-0000-000000000001");
      expect(result.events).toEqual([]);
      expect(result.nextCursor).toBeNull();
    });

    test("rejects invalid date range", async () => {
      await expect(
        WebhookService.getEvents("00000000-0000-0000-0000-000000000001", {
          from: "2026-02-01",
          to: "2026-01-01",
        })
      ).rejects.toThrow("from must be before");
    });

    test("rejects invalid from date", async () => {
      await expect(
        WebhookService.getEvents("00000000-0000-0000-0000-000000000001", { from: "not-a-date" })
      ).rejects.toThrow("Invalid from date");
    });
  });

  describe("getDeliveries", () => {
    test("rejects invalid date range", async () => {
      await expect(
        WebhookService.getDeliveries("00000000-0000-0000-0000-000000000001", "event-1", {
          from: "2026-12-01",
          to: "2026-01-01",
        })
      ).rejects.toThrow("from must be before");
    });
  });
});
