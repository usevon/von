import { db, eq, sql } from "@usevon/db";
import { tunnel } from "@usevon/db/schema";
import {
  BadRequestError,
  generateTunnelId,
  generateTunnelSecret,
  NotFoundError,
} from "@usevon/utils";
import { createLogger } from "@usevon/utils/logger";
import { Elysia } from "elysia";
import { env } from "@/env";
import { requireScope, validateSession } from "@/modules/auth";
import type { TunnelResponse } from "@/modules/tunnel/model";
import { TunnelModel } from "@/modules/tunnel/model";
import { TunnelService } from "@/modules/tunnel/service";

export { TunnelModel } from "@/modules/tunnel/model";
export { TunnelService } from "@/modules/tunnel/service";

const log = createLogger({ name: "tunnel" });

const SESSION_VALIDATION_INTERVAL_MS = 30_000;

export const tunnelRegisterWrite = new Elysia()
  .use(requireScope("write:tunnels"))
  .post(
    "/register",
    async ({ body, organizationId, userId }) => {
      const tunnelId = generateTunnelId(organizationId, userId, body.port);

      // Check if tunnel exists in DB
      const [existing] = await db
        .select()
        .from(tunnel)
        .where(eq(tunnel.id, tunnelId))
        .limit(1);

      if (existing) {
        return { tunnelId, secret: existing.secret };
      }

      // New tunnel - check limit
      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(tunnel)
        .where(eq(tunnel.organizationId, organizationId));
      if ((countResult[0]?.count ?? 0) >= env.MAX_TUNNELS_PER_ORG) {
        throw new BadRequestError(
          `Maximum ${env.MAX_TUNNELS_PER_ORG} tunnels per organization`
        );
      }

      // Generate secret and save to DB
      const secret = generateTunnelSecret();
      await db.insert(tunnel).values({
        id: tunnelId,
        secret,
        organizationId,
        userId,
        port: body.port,
      });

      return { tunnelId, secret };
    },
    {
      body: TunnelModel.registerBody,
      response: TunnelModel.registerResponse,
    }
  )
  .post(
    "/rotate/:tunnelId",
    async ({ params, organizationId, userId }) => {
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
        throw new NotFoundError("Tunnel not found");
      }

      // Generate new secret
      const secret = generateTunnelSecret();
      await db
        .update(tunnel)
        .set({ secret })
        .where(eq(tunnel.id, params.tunnelId));

      // Update in-memory connection if active
      TunnelService.updateSecret(params.tunnelId, secret);

      return { secret };
    },
    {
      response: TunnelModel.rotateResponse,
    }
  );

export const tunnelRegisterRead = new Elysia()
  .use(requireScope("read:tunnels"))
  .get("/tunnels", ({ organizationId }) => ({
    tunnels: TunnelService.getActiveTunnels(organizationId),
  }));

export const tunnelWs = new Elysia().ws("/ws/:tunnelId", {
  async open(ws) {
    const tunnelId = ws.data.params.tunnelId;
    const authHeader = ws.data.headers?.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      ws.close(4001, "Unauthorized");
      return;
    }

    const headers: Record<string, string> = {};
    for (const [key, value] of Object.entries(ws.data.headers ?? {})) {
      if (value) {
        headers[key] = value;
      }
    }

    // Validate session before accepting connection
    const organizationId = await validateSession(headers);
    if (!organizationId) {
      ws.close(4001, "Unauthorized");
      return;
    }

    // Fetch tunnel from DB and verify ownership
    const [tunnelRecord] = await db
      .select()
      .from(tunnel)
      .where(eq(tunnel.id, tunnelId))
      .limit(1);

    if (!tunnelRecord || tunnelRecord.organizationId !== organizationId) {
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
      secret: tunnelRecord.secret,
    };

    // Periodic session validation + Redis TTL refresh
    connection.validationInterval = setInterval(async () => {
      const sessionOrgId = await validateSession(headers);
      if (!sessionOrgId) {
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
      let response: TunnelResponse;

      if (
        typeof message === "object" &&
        message !== null &&
        "requestId" in message
      ) {
        response = message as TunnelResponse;
      } else if (typeof message === "string") {
        response = JSON.parse(message);
      } else if (message instanceof ArrayBuffer) {
        response = JSON.parse(new TextDecoder().decode(message));
      } else if (ArrayBuffer.isView(message)) {
        response = JSON.parse(new TextDecoder().decode(message));
      } else {
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

export const tunnelProxy = new Elysia()
  .all("/:tunnelIdWithSecret/*", ({ params, request, set, status }) => {
    const parsed = parseTunnelParam(params.tunnelIdWithSecret);
    if (
      !(parsed && TunnelService.validateSecret(parsed.tunnelId, parsed.secret))
    ) {
      return status(401, { error: "Invalid tunnel" });
    }
    const path =
      new URL(request.url).pathname.replace(
        `/${params.tunnelIdWithSecret}`,
        ""
      ) || "/";
    return TunnelService.handleProxy(
      parsed.tunnelId,
      request,
      set as Parameters<typeof TunnelService.handleProxy>[2],
      path
    );
  })
  .all("/:tunnelIdWithSecret", ({ params, request, set, status }) => {
    const parsed = parseTunnelParam(params.tunnelIdWithSecret);
    if (
      !(parsed && TunnelService.validateSecret(parsed.tunnelId, parsed.secret))
    ) {
      return status(401, { error: "Invalid tunnel" });
    }
    return TunnelService.handleProxy(
      parsed.tunnelId,
      request,
      set as Parameters<typeof TunnelService.handleProxy>[2],
      "/"
    );
  });
