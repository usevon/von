import { describe, expect, test } from "bun:test";
import { EndpointService } from "../../src/modules/endpoints/service";

describe("EndpointService", () => {
  describe("create", () => {
    test("rejects unsafe webhook URL", async () => {
      await expect(
        EndpointService.create({
          organizationId: "00000000-0000-0000-0000-000000000001",
          url: "http://127.0.0.1/webhook",
        })
      ).rejects.toThrow("Invalid webhook URL");
    });

    test("rejects private IP webhook URL", async () => {
      await expect(
        EndpointService.create({
          organizationId: "00000000-0000-0000-0000-000000000001",
          url: "http://192.168.1.1/webhook",
        })
      ).rejects.toThrow("Invalid webhook URL");
    });

    test("rejects non-http protocol", async () => {
      await expect(
        EndpointService.create({
          organizationId: "00000000-0000-0000-0000-000000000001",
          url: "ftp://example.com/webhook",
        })
      ).rejects.toThrow("Invalid webhook URL");
    });
  });

  describe("getById", () => {
    test("returns null for nonexistent endpoint", async () => {
      const result = await EndpointService.getById("00000000-0000-0000-0000-000000000001", "00000000-0000-0000-0000-0000000000ff");
      expect(result).toBeNull();
    });
  });

  describe("update", () => {
    test("rejects unsafe URL on update", async () => {
      await expect(
        EndpointService.update({
          organizationId: "00000000-0000-0000-0000-000000000001",
          endpointId: "ep-1",
          url: "http://10.0.0.1/hook",
        })
      ).rejects.toThrow("Invalid webhook URL");
    });

    test("returns null for nonexistent endpoint", async () => {
      const result = await EndpointService.update({
        organizationId: "00000000-0000-0000-0000-000000000001",
        endpointId: "00000000-0000-0000-0000-0000000000ff",
        description: "updated",
      });
      expect(result).toBeNull();
    });
  });

  describe("delete", () => {
    test("returns false for nonexistent endpoint", async () => {
      const result = await EndpointService.delete("00000000-0000-0000-0000-000000000001", "00000000-0000-0000-0000-0000000000ff");
      expect(result).toBe(false);
    });
  });

  describe("getEnabledEndpointsForDelivery", () => {
    test("returns empty array for org with no endpoints", async () => {
      const result =
        await EndpointService.getEnabledEndpointsForDelivery("00000000-0000-0000-0000-000000000002");
      expect(result).toEqual([]);
    });
  });
});
