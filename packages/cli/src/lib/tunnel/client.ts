import { WebSocket } from "ws";
import type { TunnelRequest, TunnelResponse } from "@/lib/tunnel/types";

const PING_INTERVAL_MS = 5000;
const MAX_BACKOFF_MS = 30_000;
const BACKOFF_BASE_MS = 1000;
const MAX_RECONNECTS = 5;

export type TunnelClientEvents = {
  request: (req: TunnelRequest) => Promise<TunnelResponse>;
  takeover?: () => void;
  sessionExpired?: () => void;
  secretRotated?: (newSecret: string) => void;
  connect?: (isReconnect: boolean) => void;
  disconnect?: (
    willReconnect: boolean,
    attempt?: number,
    maxAttempts?: number
  ) => void;
};

export class TunnelClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private shouldReconnect = true;
  private hasConnectedOnce = false;
  private readonly wsUrl: string;
  private readonly token: string;
  private readonly events: TunnelClientEvents;

  constructor(wsUrl: string, token: string, events: TunnelClientEvents) {
    this.wsUrl = wsUrl;
    this.token = token;
    this.events = events;
  }

  connect(): void {
    if (!this.shouldReconnect) {
      return;
    }

    this.ws = new WebSocket(this.wsUrl, {
      headers: { Authorization: `Bearer ${this.token}` },
    });

    this.ws.on("open", () => {
      const isReconnect = this.hasConnectedOnce;
      this.hasConnectedOnce = true;
      this.reconnectAttempts = 0;
      this.events.connect?.(isReconnect);
      this.startPing();
    });

    this.ws.on("message", (data) => {
      this.handleMessage(String(data));
    });

    this.ws.on("close", () => {
      this.stopPing();
      if (!this.shouldReconnect) {
        return;
      }

      if (this.reconnectAttempts < MAX_RECONNECTS) {
        this.reconnectAttempts += 1;
        const delay = Math.min(
          BACKOFF_BASE_MS * 2 ** this.reconnectAttempts,
          MAX_BACKOFF_MS
        );
        this.events.disconnect?.(true, this.reconnectAttempts, MAX_RECONNECTS);
        setTimeout(() => this.connect(), delay);
      } else {
        this.events.disconnect?.(false);
      }
    });

    // Swallow error events since close fires after and drives the reconnect
    this.ws.on("error", () => undefined);
  }

  terminate(): void {
    this.shouldReconnect = false;
    this.stopPing();
    this.ws?.terminate();
  }

  private async handleMessage(text: string): Promise<void> {
    let msg: { type?: unknown; secret?: unknown } & Partial<TunnelRequest>;
    try {
      msg = JSON.parse(text);
    } catch {
      return;
    }

    if (msg.type === "takeover") {
      this.shouldReconnect = false;
      this.events.takeover?.();
      this.ws?.close();
      return;
    }

    if (msg.type === "session_expired") {
      this.shouldReconnect = false;
      this.events.sessionExpired?.();
      this.ws?.close();
      return;
    }

    if (msg.type === "secret_rotated") {
      if (typeof msg.secret === "string") {
        this.events.secretRotated?.(msg.secret);
      }
      return;
    }

    // Unknown control frames are ignored so protocol additions never crash the CLI
    if (msg.type !== undefined) {
      return;
    }

    if (!(msg.id && msg.method)) {
      return;
    }

    const res = await this.events
      .request(msg as TunnelRequest)
      .catch(() => null);
    if (res) {
      this.ws?.send(JSON.stringify(res));
    }
  }

  // Client side pings detect half open sockets and keep the server idle window fresh
  private startPing(): void {
    let pongReceived = true;

    this.pingInterval = setInterval(() => {
      if (!pongReceived) {
        this.ws?.terminate();
        return;
      }
      pongReceived = false;
      this.ws?.ping();
    }, PING_INTERVAL_MS);

    this.ws?.on("pong", () => {
      pongReceived = true;
    });
  }

  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }
}
