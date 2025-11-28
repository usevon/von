import { Elysia } from "elysia"
import { betterAuth } from "@/modules/auth"

type WebSocketData = {
  organizationId: string
  authType: "session" | "apiKey"
}

export const websocket = new Elysia()
  .ws("/subscribe", {
    async beforeHandle({ query, set, request }) {
      // Try session token from query parameter first (for WebSocket which doesn't send cookies reliably)
      const sessionToken = query.sessionToken as string | undefined
      if (sessionToken) {
        const wsHeaders = new Headers(request.headers)
        wsHeaders.set('cookie', `von.session_token=${sessionToken}`)

        const data = await betterAuth.api.getSession({
          headers: wsHeaders
        })

        if (data?.session?.activeOrganizationId) {
          return {
            organizationId: data.session.activeOrganizationId,
            authType: "session" as const,
          }
        }
      }

      // Fallback to cookies (in case they are sent)
      const data = await betterAuth.api.getSession({
        headers: request.headers
      })

      if (data?.session?.activeOrganizationId) {
        return {
          organizationId: data.session.activeOrganizationId,
          authType: "session" as const,
        }
      }

      // Try API key authentication
      const apiKey = query.apiKey as string | undefined
      if (apiKey) {
        const result = await betterAuth.api.verifyApiKey({ body: { key: apiKey } })

        if (result.valid && result.key?.organizationId) {
          return {
            organizationId: result.key.organizationId,
            authType: "apiKey" as const,
          }
        }
      }

      set.status = 401
      return { error: "Unauthorized" }
    },

    open(ws) {
      const authData = ws.data as unknown as WebSocketData
      if (!authData?.organizationId) {
        ws.close()
      }
    },

    message(ws, message) {
      try {
        const authData = ws.data as unknown as WebSocketData
        const msg = JSON.parse(message as string)

        if (msg.type === "subscribe" && msg.topic) {
          const topic = `${msg.topic}:${authData.organizationId}`
          ws.subscribe(topic)
          ws.send(JSON.stringify({ type: "subscribed", topic: msg.topic }))
        }

        if (msg.type === "unsubscribe" && msg.topic) {
          const topic = `${msg.topic}:${authData.organizationId}`
          ws.unsubscribe(topic)
          ws.send(JSON.stringify({ type: "unsubscribed", topic: msg.topic }))
        }
      } catch {
        // Invalid message format, ignore
      }
    },

    close() {},

    error() {},
  })
