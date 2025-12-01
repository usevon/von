import * as WebSocket from "ws"
import type { TunnelRequest, TunnelResponse } from "./types"

export type TunnelClientEvents = {
  request: (req: TunnelRequest) => Promise<TunnelResponse>
  takeover?: () => void
  connect?: (isReconnect: boolean) => void
  disconnect?: (willReconnect: boolean, attempt?: number, maxAttempts?: number) => void
}

export type TunnelClientOptions = {
  maxRetries?: number
}

/**
 * WebSocket client for CLI tunnel connections.
 *
 * Handles connection, reconnection, ping/pong, and message routing.
 *
 * @example
 * ```ts
 * const client = new TunnelClient(wsUrl, token, {
 *   request: async (req) => {
 *     const res = await fetch(`http://localhost:${port}${req.path}`, {
 *       method: req.method,
 *       headers: req.headers,
 *       body: req.body,
 *     })
 *     return {
 *       requestId: req.id,
 *       status: res.status,
 *       headers: Object.fromEntries(res.headers),
 *       body: await res.text(),
 *     }
 *   },
 *   takeover: () => console.log("Tunnel taken over"),
 *   connect: (isReconnect) => console.log(isReconnect ? "Reconnected" : "Connected"),
 * })
 *
 * client.connect()
 * process.on("SIGINT", () => client.disconnect())
 * ```
 */
export class TunnelClient {
  private ws: WebSocket.WebSocket | null = null
  private reconnectAttempts = 0
  private maxReconnects: number
  private pingInterval: ReturnType<typeof setInterval> | null = null
  private shouldReconnect = true
  private hasConnectedOnce = false

  constructor(
    private wsUrl: string,
    private token: string,
    private events: TunnelClientEvents,
    options: TunnelClientOptions = {}
  ) {
    this.maxReconnects = options.maxRetries ?? 5
  }

  /**
   * Connect to the tunnel server
   */
  connect(): void {
    if (!this.shouldReconnect) return

    this.ws = new WebSocket.WebSocket(this.wsUrl, {
      headers: { Authorization: `Bearer ${this.token}` },
    })

    // Connection established - reset state and start heartbeat
    this.ws.on("open", () => {
      const isReconnect = this.hasConnectedOnce
      this.hasConnectedOnce = true
      this.reconnectAttempts = 0
      this.events.connect?.(isReconnect)
      this.startPing()
    })

    // Handle incoming messages from tunnel server
    this.ws.on("message", async (data: WebSocket.RawData) => {
      const msg = JSON.parse(data.toString())

      // Another CLI took over - stop reconnecting
      if (msg.type === "takeover") {
        this.shouldReconnect = false
        this.events.takeover?.()
        this.ws?.close()
        return
      }

      // Forward request to local server and send response back
      const res = await this.events.request(msg as TunnelRequest)
      this.ws?.send(JSON.stringify(res))
    })

    // Handle disconnection with exponential backoff reconnect
    this.ws.on("close", () => {
      this.stopPing()
      if (!this.shouldReconnect) return

      if (this.reconnectAttempts < this.maxReconnects) {
        this.reconnectAttempts++
        const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 30000)
        this.events.disconnect?.(true, this.reconnectAttempts, this.maxReconnects)
        setTimeout(() => this.connect(), delay)
      } else {
        this.events.disconnect?.(false)
      }
    })

    // Errors trigger close event, no special handling needed
    this.ws.on("error", () => {})
  }

  /**
   * Disconnect from the tunnel server.
   * Will not attempt to reconnect.
   */
  disconnect(): void {
    this.shouldReconnect = false
    this.stopPing()
    this.ws?.close()
  }

  /**
   * Forcefully terminate the connection.
   * Use for immediate shutdown without waiting for close handshake.
   */
  terminate(): void {
    this.shouldReconnect = false
    this.stopPing()
    this.ws?.terminate()
  }

  /**
   * Start ping/pong heartbeat to detect stale connections
   */
  private startPing(): void {
    let pongReceived = true

    this.pingInterval = setInterval(() => {
      if (!pongReceived) {
        this.ws?.terminate()
        return
      }
      pongReceived = false
      this.ws?.ping()
    }, 5000)

    this.ws?.on("pong", () => {
      pongReceived = true
    })
  }

  /**
   * Stop the ping/pong heartbeat
   */
  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval)
      this.pingInterval = null
    }
  }
}
