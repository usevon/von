import pc from "picocolors";
import { TunnelClient } from "@/lib/tunnel/client";
import type {
  TunnelManagerOptions,
  TunnelRequest,
  TunnelResponse,
} from "@/lib/tunnel/types";

const FORWARD_TIMEOUT_MS = 30_000;
const GATEWAY_ERROR_STATUS = 502;

const formatPath = (path: string, maxLen = 20): string =>
  path.length > maxLen ? `${path.slice(0, maxLen)}...` : path.padEnd(maxLen);

const formatHeaders = (headers: Record<string, string>): string => {
  const entries = Object.entries(headers);
  const count = entries.length;
  if (count === 0) {
    return "(none)";
  }

  const lowerKeys = entries.map(([k]) => k.toLowerCase());
  const contentType = entries
    .find(([k]) => k.toLowerCase() === "content-type")?.[1]
    ?.split(";")[0];
  const hasSig = lowerKeys.some((k) => k.includes("signature"));

  const parts: string[] = [];
  if (contentType) {
    parts.push(contentType);
  }
  if (hasSig) {
    parts.push("signed");
  }

  if (parts.length > 0) {
    const other = count - parts.length;
    return other > 0
      ? `${parts.join(", ")} (+${other} more)`
      : parts.join(", ");
  }
  return `${count} header${count > 1 ? "s" : ""}`;
};

const formatBody = (body: string | undefined, maxLen = 80): string => {
  if (!body) {
    return "(empty)";
  }
  const trimmed = body.replace(/\s+/g, " ").trim();
  return trimmed.length > maxLen ? `${trimmed.slice(0, maxLen)}...` : trimmed;
};

const timestamp = () =>
  new Date().toLocaleTimeString("en-US", { hour12: false });

export class TunnelManager {
  private readonly tunnels: Map<number, TunnelClient> = new Map();
  private readonly verbose: boolean;
  private readonly onTakeover?: (port: number) => void;
  private readonly onSessionExpired?: (port: number) => void;
  private readonly onMaxRetries?: (port: number) => void;
  private readonly onSecretRotated?: (port: number, newSecret: string) => void;
  private readonly token: string;

  constructor(token: string, options: TunnelManagerOptions = {}) {
    this.token = token;
    this.verbose = options.verbose ?? false;
    this.onTakeover = options.onTakeover;
    this.onSessionExpired = options.onSessionExpired;
    this.onMaxRetries = options.onMaxRetries;
    this.onSecretRotated = options.onSecretRotated;
  }

  addTunnel(port: number, wsUrl: string): void {
    const client = new TunnelClient(wsUrl, this.token, {
      request: async (req: TunnelRequest): Promise<TunnelResponse> => {
        const startTime = performance.now();

        try {
          const res = await this.forwardToLocal(port, req);
          const duration = Math.round(performance.now() - startTime);
          this.logRequest(port, req, res, duration);
          return res;
        } catch (err) {
          const duration = Math.round(performance.now() - startTime);
          const error = err instanceof Error ? err : new Error(String(err));
          this.logError(port, req, error, duration);

          return {
            requestId: req.id,
            status: GATEWAY_ERROR_STATUS,
            headers: {},
            body: `Failed to forward request: ${error.message}`,
          };
        }
      },

      takeover: () => {
        console.log(
          pc.yellow(
            `  ${pc.dim(timestamp())}  ${port}  taken over by another CLI`
          )
        );
        this.tunnels.delete(port);
        this.onTakeover?.(port);
      },

      sessionExpired: () => {
        console.log(
          pc.yellow(`  ${pc.dim(timestamp())}  ${port}  session expired`)
        );
        this.tunnels.delete(port);
        this.onSessionExpired?.(port);
      },

      secretRotated: (newSecret) => {
        this.onSecretRotated?.(port, newSecret);
      },

      connect: (isReconnect) => {
        if (isReconnect) {
          console.log(pc.green(`  ${timestamp()}  ${port}  reconnected`));
        }
      },

      disconnect: (willReconnect, attempt, max) => {
        if (willReconnect) {
          console.log(
            pc.yellow(
              `  ${timestamp()}  ${port}  reconnecting (${attempt}/${max})...`
            )
          );
        } else {
          this.tunnels.delete(port);
          this.onMaxRetries?.(port);
        }
      },
    });

    this.tunnels.set(port, client);
  }

  connect(): void {
    for (const client of this.tunnels.values()) {
      client.connect();
    }
  }

  terminate(): void {
    for (const client of this.tunnels.values()) {
      client.terminate();
    }
  }

  get activeTunnels(): number {
    return this.tunnels.size;
  }

  private logRequest(
    port: number,
    req: TunnelRequest,
    res: TunnelResponse,
    durationMs: number
  ): void {
    const statusColor = res.status >= 400 ? pc.red : pc.green;
    this.logBase(port, req, statusColor(res.status.toString()), durationMs);

    if (this.verbose) {
      console.log(
        pc.dim(`                  ├─ Headers: ${formatHeaders(req.headers)}`)
      );
      console.log(pc.dim(`                  ├─ Body: ${formatBody(req.body)}`));
      console.log(
        pc.dim(
          `                  └─ Response: ${res.status} in ${durationMs}ms`
        )
      );
    }
  }

  private logError(
    port: number,
    req: TunnelRequest,
    error: Error,
    durationMs: number
  ): void {
    this.logBase(
      port,
      req,
      pc.red(GATEWAY_ERROR_STATUS.toString()),
      durationMs
    );

    if (this.verbose) {
      console.log(
        pc.dim(`                  ├─ Headers: ${formatHeaders(req.headers)}`)
      );
      console.log(pc.dim(`                  └─ Error: ${error.message}`));
    }
  }

  private logBase(
    port: number,
    req: TunnelRequest,
    status: string,
    durationMs: number
  ): void {
    const method = req.method.padEnd(6);
    const path = formatPath(req.path);
    console.log(
      `  ${pc.dim(timestamp())}  ${pc.magenta(port.toString())}  ${method} ${path}  ${status}  ${pc.dim(`${durationMs}ms`)}`
    );
  }

  private async forwardToLocal(
    port: number,
    req: TunnelRequest
  ): Promise<TunnelResponse> {
    const url = `http://localhost:${port}${req.path}`;
    const res = await fetch(url, {
      method: req.method,
      headers: req.headers,
      body: req.body,
      signal: AbortSignal.timeout(FORWARD_TIMEOUT_MS),
    });

    const responseBody = await res.text();
    const responseHeaders: Record<string, string> = {};
    res.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    return {
      requestId: req.id,
      status: res.status,
      headers: responseHeaders,
      body: responseBody,
    };
  }
}
