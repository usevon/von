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
    if (!options.port) {
      p.log.error("Port is required. Usage: von dev -p <port>")
      process.exit(1)
    }

    const { token, config } = requireAuth()!

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
      const { tunnelId, wsUrl } = await registerTunnel(token, port, organizationId)
      s.stop("Tunnel registered")

      const tunnelUrl = `${config.tunnelUrl}/${tunnelId}`

      console.log()
      console.log(pc.green("  Tunnel active"))
      console.log()
      console.log(`  ${pc.dim("URL:")}      ${pc.cyan(tunnelUrl)}`)
      console.log(`  ${pc.dim("Forward:")}  http://localhost:${port}`)
      console.log()
      console.log(pc.dim("  Press Ctrl+C to stop"))
      console.log()

      await connectTunnel(wsUrl, token, port)
    } catch (err) {
      s.stop("Error")
      p.log.error(`Failed to start tunnel: ${err instanceof Error ? err.message : "Unknown error"}`)
      process.exit(1)
    }
  })

const connectTunnel = async (
  wsUrl: string,
  token: string,
  localPort: number
): Promise<void> => {
  return new Promise((_, reject) => {
    let reconnectAttempts = 0
    const maxReconnectAttempts = 10

    const connect = () => {
      const ws = new WebSocket(wsUrl, {
        headers: { Authorization: `Bearer ${token}` },
      })

      ws.on("open", () => {
        reconnectAttempts = 0
        console.log(pc.dim("  Connected to tunnel server"))
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

      process.on("SIGINT", () => {
        console.log()
        console.log(pc.dim("  Closing tunnel..."))
        ws.close()
        process.exit(0)
      })
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
