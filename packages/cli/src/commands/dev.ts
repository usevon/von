import { Command } from "commander"
import * as p from "@clack/prompts"
import pc from "picocolors"
import { watch, type FSWatcher } from "node:fs"
import { TunnelManager } from "@usevon/tunnel"
import { requireAuth, loadConfig, getConfigPath } from "@/lib/config"
import { registerTunnel } from "@/lib/api"

export const dev = new Command("dev")
  .description("Start dev tunnel for local webhook testing")
  .option("-p, --port <port...>", "Local port(s) to forward to (max 3)")
  .option("-o, --org <orgId>", "Organization ID (uses active org if not specified)")
  .option("-v, --verbose", "Show detailed request/response info")
  .action(async (options) => {
    const { token, config } = requireAuth()

    if (!options.port || options.port.length === 0) {
      p.log.error("Port is required. Usage: von dev -p <port>")
      process.exit(1)
    }

    const ports = options.port.map((p: string) => parseInt(p, 10))
    for (const port of ports) {
      if (isNaN(port) || port < 1 || port > 65535) {
        p.log.error(`Invalid port number: ${port}`)
        process.exit(1)
      }
    }

    if (ports.length > 3) {
      p.log.error("Maximum 3 ports allowed per organization")
      process.exit(1)
    }

    const organizationId = options.org || config.organizationId

    if (!organizationId) {
      p.log.error("No organization selected. Run 'von login' or specify --org")
      process.exit(1)
    }

    const s = p.spinner()
    s.start("Registering tunnel(s)...")

    try {
      const tunnels: Array<{ port: number; tunnelUrl: string; wsUrl: string }> = []

      for (const port of ports) {
        const { tunnelUrl, wsUrl } = await registerTunnel(token, port, organizationId)
        tunnels.push({ port, tunnelUrl, wsUrl })
      }

      s.stop(`${tunnels.length} tunnel${tunnels.length > 1 ? "s" : ""} ready`)

      console.log()
      for (const t of tunnels) {
        console.log(`  ${pc.magenta(t.port.toString())}  ${t.tunnelUrl}`)
      }
      console.log()
      if (options.verbose) {
        console.log(pc.dim("  Verbose mode enabled"))
      }
      console.log(pc.dim("  Press Ctrl+C to stop"))
      console.log()

      await connectTunnels(token, tunnels, options.verbose ?? false)
    } catch (err) {
      s.stop("Error")
      p.log.error(`Failed to start tunnel: ${err instanceof Error ? err.message : "Unknown error"}`)
      process.exit(1)
    }
  })

type TunnelInfo = { port: number; tunnelUrl: string; wsUrl: string }

const connectTunnels = async (
  token: string,
  tunnels: TunnelInfo[],
  verbose: boolean
): Promise<void> => {
  return new Promise((_, reject) => {
    let isShuttingDown = false
    let configWatcher: FSWatcher | null = null

    const manager = new TunnelManager(token, {
      verbose,
      onTakeover: () => {
        if (manager.activeTunnels === 0) {
          console.log()
          console.log(pc.dim("  all tunnels taken over, exiting..."))
          process.exit(0)
        }
      },
      onMaxRetries: (port) => {
        reject(new Error(`${port} max reconnection attempts reached`))
      },
    })

    const shutdown = (reason?: string) => {
      if (isShuttingDown) return
      isShuttingDown = true
      configWatcher?.close()
      console.log()
      console.log(pc.dim(`  ${reason ?? "closing"}...`))
      manager.terminate()
      process.exit(0)
    }

    // Watch config file for logout
    const configPath = getConfigPath()
    configWatcher = watch(configPath, () => {
      const newConfig = loadConfig()
      if (!newConfig?.token) {
        shutdown("logged out, closing tunnels")
      }
    })

    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true)
      process.stdin.resume()
      process.stdin.on("data", (data) => {
        if (data[0] === 0x03) shutdown()
      })
    }

    process.on("SIGINT", shutdown)
    process.on("SIGTERM", shutdown)
    process.on("exit", () => configWatcher?.close())

    for (const tunnel of tunnels) {
      manager.addTunnel(tunnel.port, tunnel.wsUrl)
    }

    manager.connect()
  })
}
