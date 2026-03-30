import { describe, expect, test } from "bun:test";
import { InboundService } from "../../src/modules/inbound/service";

describe("InboundService", () => {
  describe("create", () => {
    test("rejects unsafe forward URL", async () => {
      await expect(
        InboundService.create({
          organizationId: "org-1",
          forwardUrl: "http://127.0.0.1/webhook",
        })
      ).rejects.toThrow("Invalid forward URL");
    });

    test("rejects private IP forward URL", async () => {
      await expect(
        InboundService.create({
          organizationId: "org-1",
          forwardUrl: "http://10.0.0.1/hook",
        })
      ).rejects.toThrow("Invalid forward URL");
    });
  });

  describe("getById", () => {
    test("returns null for nonexistent endpoint", async () => {
      const result = await InboundService.getById("org-1", "nonexistent");
      expect(result).toBeNull();
    });
  });

  describe("getByPublicId", () => {
    test("returns null for nonexistent endpoint", async () => {
      const result = await InboundService.getByPublicId("nonexistent");
      expect(result).toBeNull();
    });
  });

  describe("update", () => {
    test("rejects unsafe URL on update", async () => {
      await expect(
        InboundService.update({
          organizationId: "org-1",
          endpointId: "ep-1",
          forwardUrl: "http://192.168.0.1/hook",
        })
      ).rejects.toThrow("Invalid forward URL");
    });

    test("returns null for nonexistent endpoint", async () => {
      const result = await InboundService.update({
        organizationId: "org-1",
        endpointId: "nonexistent",
        name: "updated",
      });
      expect(result).toBeNull();
    });
  });

  describe("delete", () => {
    test("returns false for nonexistent endpoint", async () => {
      const result = await InboundService.delete("org-1", "nonexistent");
      expect(result).toBe(false);
    });
  });
});
