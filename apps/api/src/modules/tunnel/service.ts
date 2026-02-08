import type {
  TunnelConnection,
  TunnelRelayMessage,
  TunnelRequest,
  TunnelResponse,
} from "@/modules/tunnel/model";
import { createConnection, getRedisClient } from "@usevon/queue";
import { timingSafeEqual } from "@usevon/utils";
import { createLogger } from "@usevon/utils/logger";

const log = createLogger({ name: "tunnel:relay" });

const INSTANCE_ID = crypto.randomUUID();
const RELAY_CHANNEL = `tunnel:relay:${INSTANCE_ID}`;
const CONN_KEY_TTL = 60;

const tunnels = new Map<string, TunnelConnection>();
const relayPending = new Map<
  string,
  {
    resolve: (res: TunnelResponse) => void;
    reject: (err: Error) => void;
    timeout: ReturnType<typeof setTimeout>;
  }
>();

const redis = getRedisClient();
const subscriber = createConnection();

subscriber.subscribe(RELAY_CHANNEL);
subscriber.on("message", async (_channel: string, raw: string) => {
  try {
    const msg: TunnelRelayMessage = JSON.parse(raw);

    switch (msg.type) {
      case "request": {
        const connection = tunnels.get(msg.tunnelId);
        if (!connection) {
          await redis.publish(
            `tunnel:relay:${msg.replyTo}`,
            JSON.stringify({
              type: "error",
              requestId: msg.requestId,
              error: "Tunnel not connected on target instance",
            })
          );
          return;
        }

        try {
          const response = await TunnelService.forwardRequestLocal(
            connection,
            msg.request
          );
          await redis.publish(
            `tunnel:relay:${msg.replyTo}`,
            JSON.stringify({
              type: "response",
              requestId: msg.requestId,
              response,
            })
          );
        } catch (err) {
          await redis.publish(
            `tunnel:relay:${msg.replyTo}`,
            JSON.stringify({
              type: "error",
              requestId: msg.requestId,
              error: err instanceof Error ? err.message : "Relay error",
            })
          );
        }
        break;
      }
      case "response": {
        const pending = relayPending.get(msg.requestId);
        if (pending) {
          clearTimeout(pending.timeout);
          relayPending.delete(msg.requestId);
          pending.resolve(msg.response);
        }
        break;
      }
      case "error": {
        const pending = relayPending.get(msg.requestId);
        if (pending) {
          clearTimeout(pending.timeout);
          relayPending.delete(msg.requestId);
          pending.reject(new Error(msg.error));
        }
        break;
      }
    }
  } catch (err) {
    log.error(`Failed to handle relay message: ${err}`);
  }
});

export abstract class TunnelService {
  static getTunnel(tunnelId: string): TunnelConnection | undefined {
    return tunnels.get(tunnelId);
  }

  static hasTunnel(tunnelId: string): boolean {
    return tunnels.has(tunnelId);
  }

  static async setTunnel(
    tunnelId: string,
    connection: TunnelConnection
  ): Promise<void> {
    tunnels.set(tunnelId, connection);
    await Promise.all([
      redis.set(`tunnel:conn:${tunnelId}`, INSTANCE_ID, "EX", CONN_KEY_TTL),
      redis.sadd(`tunnel:org:${connection.organizationId}`, tunnelId),
    ]);
  }

  static async deleteTunnel(tunnelId: string): Promise<void> {
    const connection = tunnels.get(tunnelId);
    tunnels.delete(tunnelId);
    if (connection) {
      await Promise.all([
        redis.del(`tunnel:conn:${tunnelId}`),
        redis.srem(`tunnel:org:${connection.organizationId}`, tunnelId),
      ]);
    }
  }

  static async refreshTunnel(tunnelId: string): Promise<void> {
    await redis.expire(`tunnel:conn:${tunnelId}`, CONN_KEY_TTL);
  }

  static async getOrgTunnelCount(orgId: string): Promise<number> {
    return redis.scard(`tunnel:org:${orgId}`);
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

  static forwardRequestLocal(
    connection: TunnelConnection,
    request: TunnelRequest,
    timeoutMs = 30_000
  ): Promise<TunnelResponse> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        connection.pending.delete(request.id);
        reject(new Error("Request timeout"));
      }, timeoutMs);

      connection.pending.set(request.id, { resolve, reject, timeout });
      connection.send(JSON.stringify(request));
    });
  }

  static async forwardRequest(
    tunnelId: string,
    request: TunnelRequest,
    timeoutMs = 30_000
  ): Promise<TunnelResponse> {
    // Fast path: tunnel is on this instance
    const connection = tunnels.get(tunnelId);
    if (connection) {
      return TunnelService.forwardRequestLocal(connection, request, timeoutMs);
    }

    // Check Redis for which instance owns this tunnel
    const targetInstanceId = await redis.get(`tunnel:conn:${tunnelId}`);
    if (!targetInstanceId) {
      throw new Error("Tunnel not connected");
    }

    // Stale key — tunnel was on this instance but is gone
    if (targetInstanceId === INSTANCE_ID) {
      await redis.del(`tunnel:conn:${tunnelId}`);
      throw new Error("Tunnel not connected");
    }

    // Relay through pub/sub to the owning instance
    const requestId = request.id;
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        relayPending.delete(requestId);
        reject(new Error("Request timeout"));
      }, timeoutMs);

      relayPending.set(requestId, { resolve, reject, timeout });

      redis
        .publish(
          `tunnel:relay:${targetInstanceId}`,
          JSON.stringify({
            type: "request",
            requestId,
            tunnelId,
            request,
            replyTo: INSTANCE_ID,
          })
        )
        .catch((err) => {
          clearTimeout(timeout);
          relayPending.delete(requestId);
          reject(err);
        });
    });
  }

  static async handleProxy(
    tunnelId: string,
    request: Request,
    set: { status?: number | string; headers: Record<string, string> },
    path: string
  ): Promise<string | { error: string }> {
    const contentLength = Number.parseInt(
      request.headers.get("content-length") ?? "0",
      10
    );
    if (contentLength > 1_000_000) {
      set.status = 413;
      return { error: "Payload exceeds 1MB limit" };
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
        id: crypto.randomUUID(),
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

  static async cleanup(): Promise<void> {
    // Clean up Redis keys for all local tunnels
    const promises: Promise<unknown>[] = [];
    for (const [tunnelId, connection] of tunnels) {
      promises.push(
        redis.del(`tunnel:conn:${tunnelId}`),
        redis.srem(`tunnel:org:${connection.organizationId}`, tunnelId)
      );
    }
    await Promise.all(promises);
    tunnels.clear();

    // Clean up relay pending
    for (const [, pending] of relayPending) {
      clearTimeout(pending.timeout);
      pending.reject(new Error("Shutting down"));
    }
    relayPending.clear();

    await subscriber.unsubscribe(RELAY_CHANNEL);
    await subscriber.quit();
  }
}
