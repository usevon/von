import { Elysia, t } from "elysia"
import { createHash } from "crypto"
import { eq } from "drizzle-orm"
import { db, tunnel as tunnelTable } from "@usevon/db"
import { withSession } from "@/modules/auth"
import { BadRequestError } from "@/lib/errors"
import { env } from "@/env"

type TunnelConnection = {
  organizationId: string
  userId: string
  port: number
  createdAt: Date
  send: (data: string) => void
  pendingRequests: Map<string, {
    resolve: (response: TunnelResponse) => void
    reject: (error: Error) => void
    timeout: NodeJS.Timeout
  }>
}

type TunnelRequest = {
  id: string
  method: string
  path: string
  headers: Record<string, string>
  body?: string
}

type TunnelResponse = {
  requestId: string
  status: number
  headers: Record<string, string>
  body: string
}

const tunnels = new Map<string, TunnelConnection>()

const generateTunnelId = (orgId: string, userId: string, port: number): string => {
  return createHash("sha256")
    .update(`${orgId}:${userId}:${port}`)
    .digest("hex")
    .slice(0, 12)
}

const getTunnelUrl = () => {
  return env.TUNNEL_URL || (env.NODE_ENV === "development"
    ? `http://localhost:${env.PORT}`
    : "https://dev.usevon.com")
}

const getWsUrl = (tunnelId: string) => {
  const baseUrl = env.API_URL || (env.NODE_ENV === "development"
    ? `http://localhost:${env.PORT}`
    : "https://api.usevon.com")
  const wsUrl = baseUrl.replace("http://", "ws://").replace("https://", "wss://")
  return `${wsUrl}/api/tunnel/ws/${tunnelId}`
}

export const tunnel = new Elysia({ prefix: "/api/tunnel" })
  .use(withSession)
  .post(
    "/register",
    async ({ body, organizationId, userId }) => {
      if (!organizationId) {
        throw new BadRequestError("No active organization")
      }

      const tunnelId = generateTunnelId(organizationId, userId, body.port)

      await db.insert(tunnelTable).values({
        id: tunnelId,
        organizationId,
        userId,
        port: body.port,
        status: "pending",
        createdAt: new Date(),
      }).onConflictDoUpdate({
        target: tunnelTable.id,
        set: { status: "pending", lastPingAt: new Date() },
      })

      return {
        tunnelId,
        wsUrl: getWsUrl(tunnelId),
        tunnelUrl: `${getTunnelUrl()}/t/${tunnelId}`,
      }
    },
    {
      body: t.Object({
        port: t.Number({ minimum: 1, maximum: 65535 }),
      }),
    }
  )

export const tunnelWs = new Elysia({ prefix: "/api/tunnel" })
  .ws("/ws/:tunnelId", {
    open(ws) {
      const tunnelId = ws.data.params.tunnelId
      const authHeader = ws.data.headers?.authorization

      if (!authHeader?.startsWith("Bearer ")) {
        ws.close(4001, "Unauthorized")
        return
      }

      tunnels.set(tunnelId, {
        organizationId: "",
        userId: "",
        port: 0,
        createdAt: new Date(),
        send: (data) => ws.send(data),
        pendingRequests: new Map(),
      })

      db.update(tunnelTable)
        .set({ status: "active", lastPingAt: new Date() })
        .where(eq(tunnelTable.id, tunnelId))
        .execute()
        .catch(console.error)
    },
    message(ws, message) {
      const tunnelId = ws.data.params.tunnelId
      const connection = tunnels.get(tunnelId)
      if (!connection) return

      try {
        let messageStr: string
        if (typeof message === "string") {
          messageStr = message
        } else if (Buffer.isBuffer(message)) {
          messageStr = message.toString("utf-8")
        } else if (message instanceof ArrayBuffer) {
          messageStr = new TextDecoder().decode(message)
        } else if (ArrayBuffer.isView(message)) {
          messageStr = new TextDecoder().decode(message)
        } else {
          messageStr = String(message)
        }

        const response = JSON.parse(messageStr) as TunnelResponse
        const pending = connection.pendingRequests.get(response.requestId)
        if (pending) {
          clearTimeout(pending.timeout)
          pending.resolve(response)
          connection.pendingRequests.delete(response.requestId)
        }
      } catch (e) {
        console.error("Failed to parse tunnel response:", e)
      }
    },
    close(ws) {
      const tunnelId = ws.data.params.tunnelId
      const connection = tunnels.get(tunnelId)

      if (connection) {
        for (const [, pending] of connection.pendingRequests) {
          clearTimeout(pending.timeout)
          pending.reject(new Error("Tunnel closed"))
        }
        tunnels.delete(tunnelId)
      }

      db.update(tunnelTable)
        .set({ status: "disconnected" })
        .where(eq(tunnelTable.id, tunnelId))
        .execute()
        .catch(console.error)
    },
  })

const forwardRequest = (
  connection: TunnelConnection,
  request: TunnelRequest,
  timeoutMs: number = 30000
): Promise<TunnelResponse> => {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      connection.pendingRequests.delete(request.id)
      reject(new Error("Request timeout"))
    }, timeoutMs)

    connection.pendingRequests.set(request.id, { resolve, reject, timeout })
    connection.send(JSON.stringify(request))
  })
}

export const tunnelPublic = new Elysia({ prefix: "/t" })
  .all("/:tunnelId/*", async ({ params, request, set }) => {
    const tunnelId = params.tunnelId
    const connection = tunnels.get(tunnelId)

    if (!connection) {
      set.status = 502
      return { error: "Tunnel not connected" }
    }

    const url = new URL(request.url)
    const path = url.pathname.replace(`/t/${tunnelId}`, "") || "/"

    const headers: Record<string, string> = {}
    request.headers.forEach((value, key) => {
      if (key.toLowerCase() !== "host") {
        headers[key] = value
      }
    })

    const body = request.method !== "GET" && request.method !== "HEAD"
      ? await request.text()
      : undefined

    const tunnelRequest: TunnelRequest = {
      id: crypto.randomUUID(),
      method: request.method,
      path,
      headers,
      body,
    }

    try {
      const response = await forwardRequest(connection, tunnelRequest)

      set.status = response.status

      for (const [key, value] of Object.entries(response.headers)) {
        if (key.toLowerCase() !== "content-encoding" &&
            key.toLowerCase() !== "transfer-encoding") {
          set.headers[key] = value
        }
      }

      return response.body
    } catch (e) {
      set.status = 502
      return { error: e instanceof Error ? e.message : "Tunnel error" }
    }
  })
