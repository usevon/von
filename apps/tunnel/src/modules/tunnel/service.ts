import { createHash } from "crypto"
import type { TunnelRequest, TunnelResponse } from "@usevon/tunnel"
import type { TunnelConnection } from "./model"

const tunnels = new Map<string, TunnelConnection>()
const orgTunnelCounts = new Map<string, number>()

export abstract class TunnelService {
  static generateTunnelId(orgId: string, userId: string, port: number): string {
    return createHash("sha256")
      .update(`${orgId}:${userId}:${port}`)
      .digest("hex")
      .slice(0, 12)
  }

  static getTunnel(tunnelId: string): TunnelConnection | undefined {
    return tunnels.get(tunnelId)
  }

  static hasTunnel(tunnelId: string): boolean {
    return tunnels.has(tunnelId)
  }

  static setTunnel(tunnelId: string, connection: TunnelConnection): void {
    tunnels.set(tunnelId, connection)
  }

  static deleteTunnel(tunnelId: string): void {
    tunnels.delete(tunnelId)
  }

  static getOrgTunnelCount(orgId: string): number {
    return orgTunnelCounts.get(orgId) ?? 0
  }

  static forwardRequest(
    tunnelId: string,
    request: TunnelRequest,
    timeoutMs = 30000
  ): Promise<TunnelResponse> {
    const connection = tunnels.get(tunnelId)
    if (!connection) return Promise.reject(new Error("Tunnel not connected"))

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        connection.pending.delete(request.id)
        reject(new Error("Request timeout"))
      }, timeoutMs)

      connection.pending.set(request.id, { resolve, reject, timeout })
      connection.send(JSON.stringify(request))
    })
  }

  static async handleProxy(
    tunnelId: string,
    request: Request,
    set: { status?: number | string; headers: Record<string, string> },
    path: string
  ): Promise<string | { error: string }> {
    if (!tunnels.has(tunnelId)) {
      set.status = 502
      return { error: "Tunnel not connected" }
    }

    const headers: Record<string, string> = {}
    request.headers.forEach((value, key) => {
      if (key !== "host") headers[key] = value
    })

    const body = request.method !== "GET" && request.method !== "HEAD"
      ? await request.text()
      : undefined

    try {
      const response = await TunnelService.forwardRequest(tunnelId, {
        id: crypto.randomUUID(),
        method: request.method,
        path,
        headers,
        body,
      })

      set.status = response.status
      for (const [key, val] of Object.entries(response.headers)) {
        if (!["content-encoding", "transfer-encoding"].includes(key.toLowerCase())) {
          set.headers[key] = val
        }
      }
      return response.body
    } catch (err) {
      set.status = 502
      return { error: err instanceof Error ? err.message : "Tunnel error" }
    }
  }
}
