import { db, eq, sql } from "@usevon/db";
import { tunnel } from "@usevon/db/schema";
import { generateTunnelId, generateTunnelSecret } from "@usevon/utils";
import { createLogger } from "@usevon/utils/logger";
import { Elysia } from "elysia";
import { env } from "@/env";
import { toStringHeaders } from "@/lib/headers";
import { ErrorResponse, ReadGuard } from "@/lib/models";
import { decryptSecret, encryptSecret } from "@/lib/secret-cipher";
import { validateSessionWithUser, vonAuth } from "@/modules/auth";
import type { TunnelResponse } from "@/modules/tunnel/model";
import { TunnelModel } from "@/modules/tunnel/model";
import { TunnelService } from "@/modules/tunnel/service";

export { TunnelModel } from "@/modules/tunnel/model";
export { TunnelService } from "@/modules/tunnel/service";

const log = createLogger({ name: "tunnel" });

const SESSION_VALIDATION_INTERVAL_MS = 30_000;

const parseTunnelResponseMessage = (
  message: unknown
): TunnelResponse | null => {
  if (
    typeof message === "object" &&
    message !== null &&
    "requestId" in message
  ) {
    return message as TunnelResponse;
  }

  if (typeof message === "string") {
    return JSON.parse(message) as TunnelResponse;
  }

  if (message instanceof ArrayBuffer) {
    return JSON.parse(new TextDecoder().decode(message)) as TunnelResponse;
  }

  if (ArrayBuffer.isView(message)) {
    return JSON.parse(new TextDecoder().decode(message)) as TunnelResponse;
  }

  return null;
};

export const tunnelRegisterWrite = new Elysia()
  .use(vonAuth("write:tunnels"))
  .guard({ response: ReadGuard })
  .post(
    "/register",
    async ({ body, organizationId, userId, status }) => {
      const tunnelId = generateTunnelId(organizationId, userId, body.port);

      // Check if tunnel exists in DB
      const [existing] = await db
        .select()
        .from(tunnel)
        .where(eq(tunnel.id, tunnelId))
        .limit(1);

      if (existing) {
        return { tunnelId, secret: decryptSecret(existing.secret) };
      }

      // New tunnel - check limit
      const countResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(tunnel)
        .where(eq(tunnel.organizationId, organizationId));
      if ((countResult[0]?.count ?? 0) >= env.MAX_TUNNELS_PER_ORG) {
        return status(400, {
          error: `Maximum ${env.MAX_TUNNELS_PER_ORG} tunnels per organization`,
        });
      }

      // Generate secret and save to DB
      const secret = generateTunnelSecret();
      await db.insert(tunnel).values({
        id: tunnelId,
        secret: encryptSecret(secret),
        organizationId,
        userId,
        port: body.port,
      });

      return { tunnelId, secret };
    },
    {
      body: TunnelModel.registerBody,
      response: {
        200: TunnelModel.registerResponse,
        400: ErrorResponse,
      },
    }
  )
  .post(
    "/rotate/:tunnelId",
    async ({ params, organizationId, userId, status }) => {
      // Verify tunnel belongs to this user/org
      const [existing] = await db
        .select()
        .from(tunnel)
        .where(eq(tunnel.id, params.tunnelId))
        .limit(1);

      if (
        !existing ||
        existing.organizationId !== organizationId ||
        existing.userId !== userId
      ) {
        return status(404, { error: "Tunnel not found" });
      }

      // Generate new secret
      const secret = generateTunnelSecret();
      await db
        .update(tunnel)
        .set({ secret: encryptSecret(secret) })
        .where(eq(tunnel.id, params.tunnelId));

      // Update in-memory connection if active
      TunnelService.updateSecret(params.tunnelId, secret);

      return { secret };
    },
    {
      response: {
        200: TunnelModel.rotateResponse,
        404: ErrorResponse,
      },
    }
  );

export const tunnelRegisterRead = new Elysia()
  .use(vonAuth("read:tunnels"))
  .guard({ response: ReadGuard })
  .get("/tunnels", ({ organizationId }) => ({
    tunnels: TunnelService.getActiveTunnels(organizationId),
  }));

export const tunnelWs = new Elysia().ws("/ws/:tunnelId", {
  async beforeHandle({ headers, status }) {
    const authHeader = headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return status(401, { error: "Unauthorized" });
    }

    const session = await validateSessionWithUser(toStringHeaders(headers));
    if (!session) {
      return status(401, { error: "Unauthorized" });
    }
  },
  async open(ws) {
    const tunnelId = ws.data.params.tunnelId;

    const headers = toStringHeaders(ws.data.headers ?? {});

    // Re-validate to get organizationId (beforeHandle context doesn't persist)
    const session = await validateSessionWithUser(headers);
    if (!session) {
      ws.close(4001, "Unauthorized");
      return;
    }
    const { organizationId, userId } = session;

    // Fetch tunnel from DB and verify ownership
    const [tunnelRecord] = await db
      .select()
      .from(tunnel)
      .where(eq(tunnel.id, tunnelId))
      .limit(1);

    if (
      !tunnelRecord ||
      tunnelRecord.organizationId !== organizationId ||
      tunnelRecord.userId !== userId
    ) {
      ws.close(4001, "Tunnel not found");
      return;
    }

    // Close existing connection if tunnel is being taken over
    const existingConn = TunnelService.getTunnel(tunnelId);
    if (existingConn) {
      if (existingConn.validationInterval) {
        clearInterval(existingConn.validationInterval);
      }
      existingConn.send(JSON.stringify({ type: "takeover" }));
      existingConn.close();
    }

    const connection = {
      send: (data: string) => ws.send(data),
      close: () => ws.close(),
      pending: new Map(),
      headers,
      validationInterval: undefined as
        | ReturnType<typeof setInterval>
        | undefined,
      organizationId,
      userId,
      secret: decryptSecret(tunnelRecord.secret),
    };

    // Periodic session validation + Redis TTL refresh
    connection.validationInterval = setInterval(async () => {
      const latestSession = await validateSessionWithUser(headers);
      if (
        !latestSession ||
        latestSession.organizationId !== organizationId ||
        latestSession.userId !== userId
      ) {
        log.info(`Session expired: ${tunnelId}`);
        if (connection.validationInterval) {
          clearInterval(connection.validationInterval);
        }
        ws.close(4001, "Session expired");
        return;
      }
      await TunnelService.refreshTunnel(tunnelId);
    }, SESSION_VALIDATION_INTERVAL_MS);

    await TunnelService.setTunnel(tunnelId, connection);

    log.info(`Connected: ${tunnelId}`);
  },
  message(ws, message) {
    const tunnelId = ws.data.params.tunnelId;
    const connection = TunnelService.getTunnel(tunnelId);
    if (!connection) {
      return;
    }

    try {
      const response = parseTunnelResponseMessage(message);
      if (!response) {
        log.error(`Unknown message type: ${typeof message}`);
        return;
      }

      const pending = connection.pending.get(response.requestId);
      if (pending) {
        clearTimeout(pending.timeout);
        pending.resolve(response);
        connection.pending.delete(response.requestId);
      }
    } catch (e) {
      log.error(`Failed to parse response: ${e}`);
    }
  },
  close(ws) {
    const tunnelId = ws.data.params.tunnelId;
    const connection = TunnelService.getTunnel(tunnelId);

    if (connection) {
      if (connection.validationInterval) {
        clearInterval(connection.validationInterval);
      }
      for (const pending of connection.pending.values()) {
        clearTimeout(pending.timeout);
        pending.reject(new Error("Tunnel closed"));
      }
    }

    TunnelService.deleteTunnel(tunnelId).catch(() => {
      /* intentionally swallowed */
    });
    log.info(`Disconnected: ${tunnelId}`);
  },
});

const parseTunnelParam = (
  param: string
): { tunnelId: string; secret: string } | null => {
  const lastDash = param.lastIndexOf("-");
  if (lastDash === -1) {
    return null;
  }
  return {
    tunnelId: param.slice(0, lastDash),
    secret: param.slice(lastDash + 1),
  };
};

const handleTunnelProxy =
  (
    hasWildcard: boolean
  ): ((ctx: {
    params: { tunnelIdWithSecret: string };
    request: Request;
    set: Parameters<typeof TunnelService.handleProxy>[2];
    status: (code: number, body: unknown) => unknown;
  }) => unknown) =>
  ({ params, request, set, status }) => {
    const parsed = parseTunnelParam(params.tunnelIdWithSecret);
    if (
      !(parsed && TunnelService.validateSecret(parsed.tunnelId, parsed.secret))
    ) {
      return status(401, { error: "Invalid tunnel" });
    }
    const path = hasWildcard
      ? new URL(request.url).pathname.replace(
          `/${params.tunnelIdWithSecret}`,
          ""
        ) || "/"
      : "/";
    return TunnelService.handleProxy(parsed.tunnelId, request, set, path);
  };

export const tunnelProxy = new Elysia()
  .all("/:tunnelIdWithSecret/*", handleTunnelProxy(true) as never, {
    parse: "none",
  })
  .all("/:tunnelIdWithSecret", handleTunnelProxy(false) as never, {
    parse: "none",
  });
