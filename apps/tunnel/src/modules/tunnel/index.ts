import { Elysia } from "elysia"
import { createLogger } from "@usevon/logger"
import type { TunnelResponse } from "@usevon/tunnel"
import { betterAuth, withSession } from "@/modules/auth"
import { UnauthorizedError } from "@/lib/errors"
import { env } from "@/env"
import { TunnelModel } from "./model"
import { TunnelService } from "./service"

const log = createLogger({ name: "tunnel" })

const SESSION_VALIDATION_INTERVAL_MS = 30_000

export const tunnelRegister = new Elysia({ prefix: "/register" })
  .use(withSession)
  .post(
    "/",
    async ({ body, organizationId, userId }) => {
      if (!organizationId) {
        throw new UnauthorizedError("No active organization")
      }

      const currentCount = TunnelService.getOrgTunnelCount(organizationId)
      if (currentCount >= env.MAX_TUNNELS_PER_ORG) {
        throw new UnauthorizedError(`Maximum ${env.MAX_TUNNELS_PER_ORG} tunnels per organization`)
      }

      const tunnelId = TunnelService.generateTunnelId(organizationId, userId, body.port)

      return { tunnelId }
    },
    {
      body: TunnelModel.registerBody,
      response: TunnelModel.registerResponse,
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

      // Close existing connection if tunnel is being taken over
      const existing = TunnelService.getTunnel(tunnelId)
      if (existing) {
        if (existing.validationInterval) clearInterval(existing.validationInterval)
        existing.send(JSON.stringify({ type: "takeover" }))
        existing.close()
      }

      const headers: Record<string, string> = {}
      for (const [key, value] of Object.entries(ws.data.headers ?? {})) {
        if (value) headers[key] = value
      }

      const connection = {
        send: (data: string) => ws.send(data),
        close: () => ws.close(),
        pending: new Map(),
        headers,
        validationInterval: undefined as ReturnType<typeof setInterval> | undefined,
      }

      // Periodic session validation
      connection.validationInterval = setInterval(async () => {
        try {
          const session = await betterAuth.api.getSession({ headers: headers as HeadersInit })
          if (!session) {
            log.info(`Session expired: ${tunnelId}`)
            if (connection.validationInterval) clearInterval(connection.validationInterval)
            ws.close(4001, "Session expired")
          }
        } catch {
          log.info(`Session validation failed: ${tunnelId}`)
          if (connection.validationInterval) clearInterval(connection.validationInterval)
          ws.close(4001, "Session expired")
        }
      }, SESSION_VALIDATION_INTERVAL_MS)

      TunnelService.setTunnel(tunnelId, connection)

      log.info(`Connected: ${tunnelId}`)
    },
    message(ws, message) {
      const tunnelId = ws.data.params.tunnelId
      const connection = TunnelService.getTunnel(tunnelId)
      if (!connection) return

      try {
        let response: TunnelResponse

        if (typeof message === "object" && message !== null && "requestId" in message) {
          response = message as TunnelResponse
        } else if (typeof message === "string") {
          response = JSON.parse(message)
        } else if (message instanceof ArrayBuffer) {
          response = JSON.parse(new TextDecoder().decode(message))
        } else if (ArrayBuffer.isView(message)) {
          response = JSON.parse(new TextDecoder().decode(message))
        } else {
          log.error(`Unknown message type: ${typeof message}`)
          return
        }

        const pending = connection.pending.get(response.requestId)
        if (pending) {
          clearTimeout(pending.timeout)
          pending.resolve(response)
          connection.pending.delete(response.requestId)
        }
      } catch (e) {
        log.error(`Failed to parse response: ${e}`)
      }
    },
    close(ws) {
      const tunnelId = ws.data.params.tunnelId
      const connection = TunnelService.getTunnel(tunnelId)

      if (connection) {
        if (connection.validationInterval) clearInterval(connection.validationInterval)
        for (const pending of connection.pending.values()) {
          clearTimeout(pending.timeout)
          pending.reject(new Error("Tunnel closed"))
        }
        TunnelService.deleteTunnel(tunnelId)
      }

      log.info(`Disconnected: ${tunnelId}`)
    },
  })

export const tunnelProxy = new Elysia()
  .all("/:tunnelId/*", ({ params, request, set }) => {
    const path = new URL(request.url).pathname.replace(`/${params.tunnelId}`, "") || "/"
    return TunnelService.handleProxy(params.tunnelId, request, set as Parameters<typeof TunnelService.handleProxy>[2], path)
  })
  .all("/:tunnelId", ({ params, request, set }) =>
    TunnelService.handleProxy(params.tunnelId, request, set as Parameters<typeof TunnelService.handleProxy>[2], "/")
  )

export { TunnelModel, TunnelService }
