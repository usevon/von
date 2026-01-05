import type { TunnelRequest, TunnelResponse } from "@/types";
import { generateId, timingSafeEqual } from "@usevon/utils";
import type { TunnelConnection } from "@/modules/tunnel/model";

const tunnels = new Map<string, TunnelConnection>();
const orgTunnelCounts = new Map<string, number>();

export abstract class TunnelService {
  static getTunnel(tunnelId: string): TunnelConnection | undefined {
    return tunnels.get(tunnelId);
  }

  static hasTunnel(tunnelId: string): boolean {
    return tunnels.has(tunnelId);
  }

  static setTunnel(tunnelId: string, connection: TunnelConnection): void {
    tunnels.set(tunnelId, connection);
    const count = orgTunnelCounts.get(connection.organizationId) ?? 0;
    orgTunnelCounts.set(connection.organizationId, count + 1);
  }

  static deleteTunnel(tunnelId: string): void {
    const connection = tunnels.get(tunnelId);
    if (connection) {
      const count = orgTunnelCounts.get(connection.organizationId) ?? 0;
      if (count > 1) {
        orgTunnelCounts.set(connection.organizationId, count - 1);
      } else {
        orgTunnelCounts.delete(connection.organizationId);
      }
    }
    tunnels.delete(tunnelId);
  }

  static getOrgTunnelCount(orgId: string): number {
    return orgTunnelCounts.get(orgId) ?? 0;
  }

  static getActiveTunnels(organizationId: string): string[] {
    const active: string[] = [];
    for (const [id, conn] of tunnels) {
      if (conn.organizationId === organizationId) {
        active.push(id);
      }
    }
    return active;
  }

  static validateSecret(tunnelId: string, secret: string): boolean {
    const connection = tunnels.get(tunnelId);
    // Always perform timing-safe comparison to prevent timing attacks that reveal tunnel existence
    const secretToCompare = connection?.secret ?? "0".repeat(32);
    const isValid = timingSafeEqual(secretToCompare, secret);
    return connection ? isValid : false;
  }

  static updateSecret(tunnelId: string, newSecret: string): boolean {
    const connection = tunnels.get(tunnelId);
    if (connection) {
      connection.secret = newSecret;
      connection.send(
        JSON.stringify({ type: "secret_rotated", secret: newSecret })
      );
      return true;
    }
    return false;
  }

  static forwardRequest(
    tunnelId: string,
    request: TunnelRequest,
    timeoutMs = 30_000
  ): Promise<TunnelResponse> {
    const connection = tunnels.get(tunnelId);
    if (!connection) {
      return Promise.reject(new Error("Tunnel not connected"));
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        connection.pending.delete(request.id);
        reject(new Error("Request timeout"));
      }, timeoutMs);

      connection.pending.set(request.id, { resolve, reject, timeout });
      connection.send(JSON.stringify(request));
    });
  }

  static async handleProxy(
    tunnelId: string,
    request: Request,
    set: { status?: number | string; headers: Record<string, string> },
    path: string
  ): Promise<string | { error: string }> {
    if (!tunnels.has(tunnelId)) {
      set.status = 502;
      return { error: "Tunnel not connected" };
    }

    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      if (key !== "host") {
        headers[key] = value;
      }
    });

    const body =
      request.method !== "GET" && request.method !== "HEAD"
        ? await request.text()
        : undefined;

    try {
      const response = await TunnelService.forwardRequest(tunnelId, {
        id: generateId(),
        method: request.method,
        path,
        headers,
        body,
      });

      set.status = response.status;
      for (const [key, val] of Object.entries(response.headers)) {
        if (
          !["content-encoding", "transfer-encoding"].includes(key.toLowerCase())
        ) {
          set.headers[key] = val;
        }
      }
      return response.body;
    } catch (err) {
      set.status = 502;
      return { error: err instanceof Error ? err.message : "Tunnel error" };
    }
  }
}
