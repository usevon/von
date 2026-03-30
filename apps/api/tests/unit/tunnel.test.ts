import { afterEach, describe, expect, test } from "bun:test";
import type { TunnelConnection } from "../../src/modules/tunnel/model";
import { TunnelService } from "../../src/modules/tunnel/service";

type MockProxySet = {
  status: number | string | undefined;
  headers: Record<string, string>;
};

const createMockProxySet = (): MockProxySet => ({
  status: undefined,
  headers: {},
});

function createMockConnection(
  overrides: Partial<TunnelConnection> = {}
): TunnelConnection {
  const sent: string[] = [];
  return {
    send: (data: string) => sent.push(data),
    close: () => {
      /* noop */
    },
    pending: new Map(),
    headers: {},
    organizationId: "org-1",
    userId: "user-1",
    ...overrides,
  };
}

describe("TunnelService", () => {
  afterEach(async () => {
    // Clean up all tunnels between tests
    for (const tunnelId of ["t-1", "t-2", "t-3", "t-other"]) {
      if (TunnelService.hasTunnel(tunnelId)) {
        await TunnelService.deleteTunnel(tunnelId);
      }
    }
  });

  describe("setTunnel / getTunnel / hasTunnel", () => {
    test("stores and retrieves a tunnel connection", async () => {
      const conn = createMockConnection();
      await TunnelService.setTunnel("t-1", conn);

      expect(TunnelService.hasTunnel("t-1")).toBe(true);
      expect(TunnelService.getTunnel("t-1")).toBe(conn);
    });

    test("returns undefined for unknown tunnel", () => {
      expect(TunnelService.getTunnel("nonexistent")).toBeUndefined();
      expect(TunnelService.hasTunnel("nonexistent")).toBe(false);
    });
  });

  describe("deleteTunnel", () => {
    test("removes a tunnel connection", async () => {
      const conn = createMockConnection();
      await TunnelService.setTunnel("t-1", conn);
      await TunnelService.deleteTunnel("t-1");

      expect(TunnelService.hasTunnel("t-1")).toBe(false);
      expect(TunnelService.getTunnel("t-1")).toBeUndefined();
    });

    test("does not throw when deleting nonexistent tunnel", async () => {
      await TunnelService.deleteTunnel("nonexistent");
    });
  });

  describe("getActiveTunnels", () => {
    test("returns tunnel IDs for the given org", async () => {
      await TunnelService.setTunnel(
        "t-1",
        createMockConnection({ organizationId: "org-1" })
      );
      await TunnelService.setTunnel(
        "t-2",
        createMockConnection({ organizationId: "org-1" })
      );
      await TunnelService.setTunnel(
        "t-other",
        createMockConnection({ organizationId: "org-2" })
      );

      const active = TunnelService.getActiveTunnels("org-1");
      expect(active).toContain("t-1");
      expect(active).toContain("t-2");
      expect(active).not.toContain("t-other");
      expect(active).toHaveLength(2);

      // Cleanup extra
      await TunnelService.deleteTunnel("t-other");
    });

    test("returns empty array when no tunnels exist for org", () => {
      const active = TunnelService.getActiveTunnels("org-none");
      expect(active).toEqual([]);
    });
  });

  describe("forwardRequestLocal", () => {
    test("sends request and resolves when response arrives", async () => {
      const conn = createMockConnection();
      await TunnelService.setTunnel("t-1", conn);

      const requestPromise = TunnelService.forwardRequestLocal(conn, {
        id: "req-1",
        method: "GET",
        path: "/test",
        headers: {},
      });

      // Simulate CLI responding
      const pending = conn.pending.get("req-1");
      expect(pending).toBeDefined();
      pending?.resolve({
        requestId: "req-1",
        status: 200,
        headers: { "content-type": "application/json" },
        body: '{"ok":true}',
      });

      const response = await requestPromise;
      expect(response.status).toBe(200);
      expect(response.body).toBe('{"ok":true}');
    });

    test("rejects on timeout", async () => {
      const conn = createMockConnection();
      await TunnelService.setTunnel("t-1", conn);

      const requestPromise = TunnelService.forwardRequestLocal(
        conn,
        {
          id: "req-timeout",
          method: "GET",
          path: "/slow",
          headers: {},
        },
        50 // 50ms timeout
      );

      await expect(requestPromise).rejects.toThrow("Request timeout");
    });
  });

  describe("forwardRequest", () => {
    test("uses local fast path when tunnel is on this instance", async () => {
      const conn = createMockConnection();
      await TunnelService.setTunnel("t-1", conn);

      const requestPromise = TunnelService.forwardRequest("t-1", {
        id: "req-local",
        method: "POST",
        path: "/hook",
        headers: { "content-type": "application/json" },
        body: '{"event":"test"}',
      });

      // Resolve the pending request
      const pending = conn.pending.get("req-local");
      expect(pending).toBeDefined();
      pending?.resolve({
        requestId: "req-local",
        status: 201,
        headers: {},
        body: "created",
      });

      const response = await requestPromise;
      expect(response.status).toBe(201);
      expect(response.body).toBe("created");
    });

    test("rejects when tunnel not connected anywhere", async () => {
      await expect(
        TunnelService.forwardRequest("nonexistent", {
          id: "req-nowhere",
          method: "GET",
          path: "/",
          headers: {},
        })
      ).rejects.toThrow("Tunnel not connected");
    });
  });

  describe("handleProxy", () => {
    test("returns 413 when content-length exceeds 1MB", async () => {
      await TunnelService.setTunnel("t-1", createMockConnection());

      const set = createMockProxySet();
      const request = new Request("http://localhost/t/t-1-secret/test", {
        method: "POST",
        headers: { "content-length": "2000000" },
        body: "x",
      });

      const result = await TunnelService.handleProxy(
        "t-1",
        request,
        set,
        "/test"
      );
      expect(set.status).toBe(413);
      expect(result).toEqual({ error: "Payload exceeds 1000000 byte limit" });
    });

    test("returns 502 when tunnel is not connected", async () => {
      const set = createMockProxySet();
      const request = new Request("http://localhost/t/fake-secret/test", {
        method: "GET",
      });

      const result = await TunnelService.handleProxy(
        "fake",
        request,
        set,
        "/test"
      );
      expect(set.status).toBe(502);
      expect(result).toEqual({ error: "Tunnel not connected" });
    });

    test("forwards request and returns response", async () => {
      const conn = createMockConnection();
      await TunnelService.setTunnel("t-1", conn);

      const set = createMockProxySet();
      const request = new Request("http://localhost/t/t-1-secret/api/data", {
        method: "GET",
      });

      const proxyPromise = TunnelService.handleProxy(
        "t-1",
        request,
        set,
        "/api/data"
      );

      // Wait for the pending request to appear, then resolve it
      await new Promise((r) => setTimeout(r, 10));
      for (const [, pending] of conn.pending) {
        pending.resolve({
          requestId: "any",
          status: 200,
          headers: { "x-custom": "value" },
          body: '{"data":"hello"}',
        });
      }

      const result = await proxyPromise;
      expect(set.status).toBe(200);
      expect(set.headers["x-custom"]).toBe("value");
      expect(result).toBe('{"data":"hello"}');
    });

    test("filters out content-encoding and transfer-encoding from proxy response", async () => {
      const conn = createMockConnection();
      await TunnelService.setTunnel("t-1", conn);

      const set = createMockProxySet();
      const request = new Request("http://localhost/test", { method: "GET" });

      const proxyPromise = TunnelService.handleProxy(
        "t-1",
        request,
        set,
        "/test"
      );

      await new Promise((r) => setTimeout(r, 10));
      for (const [, pending] of conn.pending) {
        pending.resolve({
          requestId: "any",
          status: 200,
          headers: {
            "content-encoding": "gzip",
            "transfer-encoding": "chunked",
            "x-keep": "yes",
          },
          body: "body",
        });
      }

      await proxyPromise;
      expect(set.headers["content-encoding"]).toBeUndefined();
      expect(set.headers["transfer-encoding"]).toBeUndefined();
      expect(set.headers["x-keep"]).toBe("yes");
    });
  });

  describe("getOrgTunnelCount (Redis-backed)", () => {
    test("returns count of connected tunnels for an org", async () => {
      await TunnelService.setTunnel(
        "t-1",
        createMockConnection({ organizationId: "org-count" })
      );
      await TunnelService.setTunnel(
        "t-2",
        createMockConnection({ organizationId: "org-count" })
      );

      const count = await TunnelService.getOrgTunnelCount("org-count");
      expect(count).toBe(2);

      // Cleanup
      await TunnelService.deleteTunnel("t-1");
      await TunnelService.deleteTunnel("t-2");
    });

    test("returns 0 for org with no tunnels", async () => {
      const count = await TunnelService.getOrgTunnelCount("org-empty");
      expect(count).toBe(0);
    });

    test("decrements when tunnel is deleted", async () => {
      await TunnelService.setTunnel(
        "t-1",
        createMockConnection({ organizationId: "org-dec" })
      );
      await TunnelService.setTunnel(
        "t-2",
        createMockConnection({ organizationId: "org-dec" })
      );

      await TunnelService.deleteTunnel("t-1");
      const count = await TunnelService.getOrgTunnelCount("org-dec");
      expect(count).toBe(1);

      await TunnelService.deleteTunnel("t-2");
    });
  });

  describe("refreshTunnel", () => {
    test("does not throw for existing tunnel", async () => {
      await TunnelService.setTunnel("t-1", createMockConnection());
      await TunnelService.refreshTunnel("t-1");
    });

    test("does not throw for nonexistent tunnel", async () => {
      await TunnelService.refreshTunnel("nonexistent");
    });
  });
});
