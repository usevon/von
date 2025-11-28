import type { Server } from "bun"

let serverInstance: Server<unknown> | null = null

export const setWebSocketServer = (server: Server<unknown>) => {
  serverInstance = server
}

export const getWebSocketServer = () => {
  if (!serverInstance) {
    throw new Error("WebSocket server not initialized")
  }
  return serverInstance
}

export const publish = (topic: string, data: unknown) => {
  const server = getWebSocketServer()
  const message = JSON.stringify({ topic, data })
  const sent = server.publish(topic, message)
  return sent
}
