import { Command } from "commander"
import * as p from "@clack/prompts"
import pc from "picocolors"
import WebSocket from "ws"
import { requireAuth } from "@/lib/config"
import { registerTunnel } from "@/lib/api"

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

export const dev = new Command("dev")
  .description("Start dev tunnel for local webhook testing")
  .option("-p, --port <port>", "Local port to forward to")
  .option("-o, --org <orgId>", "Organization ID (uses active org if not specified)")
  .action(async (options) => {
    const { token, config } = requireAuth()

    if (!options.port) {
      p.log.error("Port is required. Usage: von dev -p <port>")
      process.exit(1)
    }

    const port = parseInt(options.port, 10)
    if (isNaN(port) || port < 1 || port > 65535) {
      p.log.error("Invalid port number")
      process.exit(1)
    }

    const organizationId = options.org || config.organizationId

    if (!organizationId) {
      p.log.error("No organization selected. Run 'von login' or specify --org")
      process.exit(1)
    }

    const s = p.spinner()
    s.start("Registering tunnel...")

    try {
      const { tunnelUrl } = await registerTunnel(token, port, organizationId)
      s.stop("Tunnel registered")

      console.log()
      console.log(pc.green("  Tunnel active"))
      console.log()
      console.log(`  ${pc.dim("URL:")}      ${pc.cyan(tunnelUrl)}`)
      console.log(`  ${pc.dim("Forward:")}  http://localhost:${port}`)
      console.log()
      console.log(pc.dim("  Press Ctrl+C to stop"))
      console.log()

      await connectTunnel(token, port, organizationId, config.tunnelUrl)
    } catch (err) {
      s.stop("Error")
      p.log.error(`Failed to start tunnel: ${err instanceof Error ? err.message : "Unknown error"}`)
      process.exit(1)
    }
  })

const connectTunnel = async (
  token: string,
  localPort: number,
  organizationId: string,
  tunnelBaseUrl: string
): Promise<void> => {
  return new Promise((_, reject) => {
    let reconnectAttempts = 0
    const maxReconnectAttempts = 10
    let currentWs: WebSocket | null = null
    let isShuttingDown = false
    let pingInterval: NodeJS.Timeout | null = null

    const shutdown = () => {
      if (isShuttingDown) return
      isShuttingDown = true
      console.log()
      console.log(pc.dim("  Closing tunnel..."))
      if (pingInterval) clearInterval(pingInterval)
      if (currentWs) currentWs.terminate()
      process.exit(0)
    }

    // Handle Ctrl+C on Windows via raw stdin
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true)
      process.stdin.resume()
      process.stdin.on("data", (data) => {
        // Ctrl+C is 0x03
        if (data[0] === 0x03) shutdown()
      })
    }

    process.on("SIGINT", shutdown)
    process.on("SIGTERM", shutdown)

    const connect = async () => {
      if (isShuttingDown) return

      try {
        // Re-register tunnel on each connect (handles server restarts)
        const { wsUrl, tunnelUrl } = await registerTunnel(token, localPort, organizationId)

        if (reconnectAttempts > 0) {
          console.log(pc.green(`  Tunnel re-registered: ${tunnelUrl}`))
        }

        const ws = new WebSocket(wsUrl, {
          headers: { Authorization: `Bearer ${token}` },
        })
        currentWs = ws

        ws.on("open", () => {
          const wasReconnect = reconnectAttempts > 0
          reconnectAttempts = 0
          if (wasReconnect) {
            console.log(pc.green("  Reconnected to tunnel server"))
          } else {
            console.log(pc.dim("  Connected to tunnel server"))
          }

          let pongReceived = true

          // Heartbeat ping every 10 seconds
          pingInterval = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              if (!pongReceived) {
                console.log(pc.yellow("  Connection stale, reconnecting..."))
                ws.terminate()
                return
              }
              pongReceived = false
              ws.ping()
            }
          }, 10000)

          ws.on("pong", () => {
            pongReceived = true
          })

          ws.on("close", () => {
            if (pingInterval) {
              clearInterval(pingInterval)
              pingInterval = null
            }
          })
        })

        ws.on("message", async (data) => {
          try {
            const request: TunnelRequest = JSON.parse(data.toString())
            await handleRequest(ws, request, localPort)
          } catch (err) {
            console.log(pc.red(`  Error handling request: ${err instanceof Error ? err.message : "Unknown"}`))
          }
        })

        ws.on("close", () => {
          if (isShuttingDown) return

          if (reconnectAttempts < maxReconnectAttempts) {
            reconnectAttempts++
            const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000)
            console.log(pc.yellow(`  Disconnected. Reconnecting in ${delay / 1000}s...`))
            setTimeout(connect, delay)
          } else {
            reject(new Error("Max reconnection attempts reached"))
          }
        })

        ws.on("error", (err) => {
          console.log(pc.red(`  WebSocket error: ${err.message}`))
        })
      } catch (err) {
        if (isShuttingDown) return

        if (reconnectAttempts < maxReconnectAttempts) {
          reconnectAttempts++
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000)
          console.log(pc.yellow(`  Registration failed. Retrying in ${delay / 1000}s...`))
          setTimeout(connect, delay)
        } else {
          reject(new Error("Max reconnection attempts reached"))
        }
      }
    }

    connect()
  })
}

const handleRequest = async (
  ws: WebSocket,
  request: TunnelRequest,
  localPort: number
): Promise<void> => {
  const timestamp = new Date().toLocaleTimeString()
  console.log(`  ${pc.dim(timestamp)} ${pc.cyan(request.method)} ${request.path}`)

  try {
    const url = `http://localhost:${localPort}${request.path}`

    const res = await fetch(url, {
      method: request.method,
      headers: request.headers,
      body: request.body,
    })

    const responseBody = await res.text()
    const responseHeaders: Record<string, string> = {}
    res.headers.forEach((value, key) => {
      responseHeaders[key] = value
    })

    const response: TunnelResponse = {
      requestId: request.id,
      status: res.status,
      headers: responseHeaders,
      body: responseBody,
    }

    ws.send(JSON.stringify(response))

    const statusColor = res.status >= 400 ? pc.red : res.status >= 300 ? pc.yellow : pc.green
    console.log(`  ${pc.dim(timestamp)} ${statusColor(res.status.toString())} ${pc.dim(`(${responseBody.length} bytes)`)}`)
  } catch (err) {
    const response: TunnelResponse = {
      requestId: request.id,
      status: 502,
      headers: {},
      body: `Failed to forward request: ${err instanceof Error ? err.message : "Unknown error"}`,
    }

    ws.send(JSON.stringify(response))
    console.log(`  ${pc.dim(timestamp)} ${pc.red("502")} ${pc.dim("(forward failed)")}`)
  }
}
