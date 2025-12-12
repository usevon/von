import { Command } from "commander"
import * as p from "@clack/prompts"
import pc from "picocolors"
import { loadConfig } from "@/lib/config"
import { getSession, listOrganizations } from "@/lib/api"

export const status = new Command("status")
  .description("Show current status")
  .action(async () => {
    const config = loadConfig()
    if (!config.token) {
      p.log.warn("Not logged in")
      return
    }

    const session = await getSession(config.token)
    if (!session) {
      p.log.warn("Session expired, run 'von login' to re-authenticate")
      return
    }

    const orgs = await listOrganizations(config.token)
    const currentOrg = orgs.find((o) => o.id === config.organizationId)

    p.note(
      [
        `${pc.dim("User:")}         ${pc.cyan(session.user.email)}`,
        `${pc.dim("Organization:")} ${currentOrg ? pc.cyan(currentOrg.name) : pc.yellow("None")}`,
        `${pc.dim("API:")}          ${pc.dim(config.apiUrl)}`,
      ].join("\n"),
      "Status"
    )
    p.outro(`Use ${pc.dim("von logout")} to sign out`)
  })
