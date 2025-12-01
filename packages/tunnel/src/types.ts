/**
 * Request forwarded from tunnel server to CLI
 */
export type TunnelRequest = {
  id: string
  method: string
  path: string
  headers: Record<string, string>
  body?: string
}

/**
 * Response from CLI back to tunnel server
 */
export type TunnelResponse = {
  requestId: string
  status: number
  headers: Record<string, string>
  body: string
}

/**
 * Control messages sent from server to client
 */
export type TunnelControlMessage = { type: "takeover" }

/**
 * All possible WebSocket message types
 */
export type TunnelMessage = TunnelRequest | TunnelResponse | TunnelControlMessage

/**
 * Bun WebSocket message types
 */
export type WsMessage = string | ArrayBufferView | ArrayBuffer
