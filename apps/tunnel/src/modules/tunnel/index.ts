import { Elysia, t } from "elysia"
import { createHash } from "crypto"
import { withSession } from "@/modules/auth"
import { UnauthorizedError } from "@/lib/errors"
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
const orgTunnelCounts = new Map<string, number>()

const generateTunnelId = (orgId: string, userId: string, port: number): string => {
  return createHash("sha256")
    .update(`${orgId}:${userId}:${port}`)
    .digest("hex")
    .slice(0, 12)
}

const getTunnelUrl = (tunnelId: string) => {
  const baseUrl = env.TUNNEL_URL ?? `http://localhost:${env.PORT}`
  return `${baseUrl}/${tunnelId}`
}

const getWsUrl = (tunnelId: string) => {
  const baseUrl = env.TUNNEL_URL ?? `http://localhost:${env.PORT}`
  const wsUrl = baseUrl.replace("http://", "ws://").replace("https://", "wss://")
  return `${wsUrl}/ws/${tunnelId}`
}

export const tunnelRegister = new Elysia({ prefix: "/register" })
  .use(withSession)
  .post(
    "/",
    async ({ body, organizationId, userId }) => {
      if (!organizationId) {
        throw new UnauthorizedError("No active organization")
      }

      const currentCount = orgTunnelCounts.get(organizationId) ?? 0
      if (currentCount >= env.MAX_TUNNELS_PER_ORG) {
        throw new UnauthorizedError(`Maximum ${env.MAX_TUNNELS_PER_ORG} tunnels per organization`)
      }

      const tunnelId = generateTunnelId(organizationId, userId, body.port)

      return {
        tunnelId,
        wsUrl: getWsUrl(tunnelId),
        tunnelUrl: getTunnelUrl(tunnelId),
      }
    },
    {
      body: t.Object({
        port: t.Number({ minimum: 1, maximum: 65535 }),
      }),
    }
  )

export const tunnelWs = new Elysia()
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

      console.log(`[tunnel] Connected: ${tunnelId}`)
    },
    message(ws, message) {
      const tunnelId = ws.data.params.tunnelId
      const connection = tunnels.get(tunnelId)
      if (!connection) return

      try {
        let response: TunnelResponse

        // Elysia may auto-parse JSON or send various types
        if (typeof message === "object" && message !== null && "requestId" in message) {
          // Already parsed object
          response = message as TunnelResponse
        } else if (typeof message === "string") {
          response = JSON.parse(message)
        } else if (Buffer.isBuffer(message)) {
          response = JSON.parse(message.toString("utf-8"))
        } else if (message instanceof ArrayBuffer) {
          response = JSON.parse(new TextDecoder().decode(message))
        } else if (ArrayBuffer.isView(message)) {
          response = JSON.parse(new TextDecoder().decode(message))
        } else {
          console.error("[tunnel] Unknown message type:", typeof message, message)
          return
        }
        const pending = connection.pendingRequests.get(response.requestId)
        if (pending) {
          clearTimeout(pending.timeout)
          pending.resolve(response)
          connection.pendingRequests.delete(response.requestId)
        }
      } catch (e) {
        console.error("[tunnel] Failed to parse response:", e)
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

      console.log(`[tunnel] Disconnected: ${tunnelId}`)
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

export const tunnelProxy = new Elysia()
  .all("/:tunnelId/*", async ({ params, request, set }) => {
    const tunnelId = params.tunnelId
    const connection = tunnels.get(tunnelId)

    if (!connection) {
      set.status = 502
      return { error: "Tunnel not connected" }
    }

    const url = new URL(request.url)
    const path = url.pathname.replace(`/${tunnelId}`, "") || "/"

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
  .all("/:tunnelId", async ({ params, request, set }) => {
    const tunnelId = params.tunnelId
    const connection = tunnels.get(tunnelId)

    if (!connection) {
      set.status = 502
      return { error: "Tunnel not connected" }
    }

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
      path: "/",
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
