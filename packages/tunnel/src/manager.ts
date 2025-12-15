import pc from "picocolors"
import { TunnelClient } from "./client"
import type { TunnelRequest, TunnelResponse } from "./types"

export type TunnelManagerOptions = {
  verbose?: boolean
  onTakeover?: (port: number) => void
  onMaxRetries?: (port: number) => void
  onSecretRotated?: (port: number, newSecret: string) => void
}

export type TunnelOptions = {
  timeout?: number
  maxRetries?: number
}

export type ConnectionState = "connecting" | "connected" | "reconnecting" | "disconnected"

export type TunnelStats = {
  requests: number
  errors: number
  avgMs: number
}

type TunnelEntry = {
  port: number
  client: TunnelClient
  state: ConnectionState
  stats: {
    requests: number
    errors: number
    totalMs: number
  }
}

const formatPath = (path: string, maxLen = 20): string => {
  return path.length > maxLen ? path.slice(0, maxLen) + "..." : path.padEnd(maxLen)
}

const formatHeaders = (headers: Record<string, string>): string => {
  const entries = Object.entries(headers)
  const count = entries.length
  if (count === 0) return "(none)"

  const lowerKeys = entries.map(([k]) => k.toLowerCase())
  const contentType = entries.find(([k]) => k.toLowerCase() === "content-type")?.[1]?.split(";")[0]
  const hasSig = lowerKeys.some((k) => k.includes("signature"))

  const parts: string[] = []
  if (contentType) parts.push(contentType)
  if (hasSig) parts.push("signed")

  if (parts.length > 0) {
    const other = count - parts.length
    return other > 0 ? `${parts.join(", ")} (+${other} more)` : parts.join(", ")
  }
  return `${count} header${count > 1 ? "s" : ""}`
}

const formatBody = (body: string | undefined, maxLen = 80): string => {
  if (!body) return "(empty)"
  const trimmed = body.replace(/\s+/g, " ").trim()
  return trimmed.length > maxLen ? trimmed.slice(0, maxLen) + "..." : trimmed
}

const timestamp = () => new Date().toLocaleTimeString("en-US", { hour12: false })

export class TunnelManager {
  private tunnels: Map<number, TunnelEntry> = new Map()
  private verbose: boolean
  private onTakeover?: (port: number) => void
  private onMaxRetries?: (port: number) => void
  private onSecretRotated?: (port: number, newSecret: string) => void

  constructor(
    private token: string,
    options: TunnelManagerOptions = {}
  ) {
    this.verbose = options.verbose ?? false
    this.onTakeover = options.onTakeover
    this.onMaxRetries = options.onMaxRetries
    this.onSecretRotated = options.onSecretRotated
  }

  addTunnel(port: number, wsUrl: string, options: TunnelOptions = {}): void {
    const { timeout = 30000, maxRetries = 5 } = options

    const entry: TunnelEntry = {
      port,
      client: null as unknown as TunnelClient,
      state: "connecting",
      stats: { requests: 0, errors: 0, totalMs: 0 },
    }

    const client = new TunnelClient(wsUrl, this.token, {
      request: async (req: TunnelRequest): Promise<TunnelResponse> => {
        const startTime = performance.now()

        try {
          const res = await this.forwardToLocal(port, req, timeout)
          const duration = Math.round(performance.now() - startTime)

          entry.stats.requests++
          entry.stats.totalMs += duration

          this.logRequest(port, req, res, duration)
          return res
        } catch (err) {
          const duration = Math.round(performance.now() - startTime)
          const error = err instanceof Error ? err : new Error(String(err))

          entry.stats.errors++
          entry.stats.totalMs += duration

          this.logError(port, req, error, duration)

          return {
            requestId: req.id,
            status: 502,
            headers: {},
            body: `Failed to forward request: ${error.message}`,
          }
        }
      },

      takeover: () => {
        console.log(pc.yellow(`  ${pc.dim(timestamp())}  ${port}  taken over by another CLI`))
        entry.state = "disconnected"
        this.tunnels.delete(port)
        this.onTakeover?.(port)
      },

      secretRotated: (newSecret) => {
        this.onSecretRotated?.(port, newSecret)
      },

      connect: (isReconnect) => {
        entry.state = "connected"
        if (isReconnect) {
          console.log(pc.green(`  ${timestamp()}  ${port}  reconnected`))
        }
      },

      disconnect: (willReconnect, attempt, max) => {
        entry.state = willReconnect ? "reconnecting" : "disconnected"
        if (willReconnect) {
          console.log(pc.yellow(`  ${timestamp()}  ${port}  reconnecting (${attempt}/${max})...`))
        } else {
          this.tunnels.delete(port)
          this.onMaxRetries?.(port)
        }
      },
    }, { maxRetries })

    entry.client = client
    this.tunnels.set(port, entry)
  }

  connect(): void {
    for (const entry of this.tunnels.values()) {
      entry.client.connect()
    }
  }

  disconnect(): void {
    for (const entry of this.tunnels.values()) {
      entry.client.disconnect()
    }
  }

  terminate(): void {
    for (const entry of this.tunnels.values()) {
      entry.client.terminate()
    }
  }

  get activeTunnels(): number {
    return this.tunnels.size
  }

  getState(port: number): ConnectionState | null {
    return this.tunnels.get(port)?.state ?? null
  }

  getStats(port: number): TunnelStats | null {
    const entry = this.tunnels.get(port)
    if (!entry) return null

    return {
      requests: entry.stats.requests,
      errors: entry.stats.errors,
      avgMs: entry.stats.requests > 0 ? Math.round(entry.stats.totalMs / entry.stats.requests) : 0,
    }
  }

  private logRequest(port: number, req: TunnelRequest, res: TunnelResponse, durationMs: number): void {
    const statusColor = res.status >= 400 ? pc.red : pc.green
    const method = req.method.padEnd(6)
    const path = formatPath(req.path)

    console.log(`  ${pc.dim(timestamp())}  ${pc.magenta(port.toString())}  ${method} ${path}  ${statusColor(res.status.toString())}  ${pc.dim(durationMs + "ms")}`)

    if (this.verbose) {
      console.log(pc.dim(`                  ├─ Headers: ${formatHeaders(req.headers)}`))
      console.log(pc.dim(`                  ├─ Body: ${formatBody(req.body)}`))
      console.log(pc.dim(`                  └─ Response: ${res.status} in ${durationMs}ms`))
    }
  }

  private logError(port: number, req: TunnelRequest, error: Error, durationMs: number): void {
    const method = req.method.padEnd(6)
    const path = formatPath(req.path)

    console.log(`  ${pc.dim(timestamp())}  ${pc.magenta(port.toString())}  ${method} ${path}  ${pc.red("502")}  ${pc.dim(durationMs + "ms")}`)

    if (this.verbose) {
      console.log(pc.dim(`                  ├─ Headers: ${formatHeaders(req.headers)}`))
      console.log(pc.dim(`                  └─ Error: ${error.message}`))
    }
  }

  private async forwardToLocal(port: number, req: TunnelRequest, timeout: number): Promise<TunnelResponse> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      const url = `http://localhost:${port}${req.path}`
      const res = await fetch(url, {
        method: req.method,
        headers: req.headers,
        body: req.body,
        signal: controller.signal,
      })

      const responseBody = await res.text()
      const responseHeaders: Record<string, string> = {}
      res.headers.forEach((value, key) => {
        responseHeaders[key] = value
      })

      return {
        requestId: req.id,
        status: res.status,
        headers: responseHeaders,
        body: responseBody,
      }
    } finally {
      clearTimeout(timeoutId)
    }
  }
}
