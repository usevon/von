import { Command } from "commander"
import * as p from "@clack/prompts"
import pc from "picocolors"
import { requireAuth } from "@/lib/config"
import { rotateTunnel, getSession } from "@/lib/api"
import { generateTunnelId } from "@usevon/utils"

export const rotate = new Command("rotate")
  .description("Rotate tunnel secret to invalidate the current URL")
  .option("-p, --port <port>", "Port of the tunnel to rotate")
  .action(async (options) => {
    const { token, config } = requireAuth()

    if (!options.port) {
      p.log.error("Port is required. Usage: von rotate -p <port>")
      return
    }

    const port = parseInt(options.port, 10)
    if (isNaN(port) || port < 1 || port > 65535) {
      p.log.error(`Invalid port number: ${options.port}`)
      return
    }

    const organizationId = config.organizationId
    if (!organizationId) {
      p.log.error("No organization selected. Run 'von login' or 'von switch'")
      return
    }

    const s = p.spinner()
    s.start("Rotating tunnel secret...")

    try {
      const session = await getSession(token)
      if (!session) {
        s.stop("Error")
        p.log.error("Session expired, run 'von login' to re-authenticate")
        return
      }

      const tunnelId = generateTunnelId(organizationId, session.user.id, port)
      const { secret } = await rotateTunnel(token, tunnelId)

      s.stop("Secret rotated")

      const tunnelUrl = `${config.tunnelUrl}/${tunnelId}-${secret}`
      p.note(
        `${pc.dim("Port:")}   ${pc.magenta(port.toString())}\n${pc.dim("URL:")}    ${pc.cyan(tunnelUrl)}`,
        "New Tunnel URL"
      )
      p.log.success("Old URLs will no longer work")
    } catch (err) {
      s.stop("Error")
      p.log.error(`Failed to rotate tunnel: ${err instanceof Error ? err.message : "Unknown error"}`)
    }
  })
