import { Command } from "commander"
import * as p from "@clack/prompts"
import pc from "picocolors"
import { requireAuth } from "@/lib/config"
import { getSession, listOrganizations } from "@/lib/api"

export const status = new Command("status")
  .description("Show current status")
  .action(async () => {
    const auth = requireAuth(false)
    if (!auth) {
      p.log.info("Run 'von login' to authenticate")
      return
    }

    const { token, config } = auth

    const session = await getSession(token)
    if (!session) {
      p.log.warn("Session expired, run 'von login' to re-authenticate")
      return
    }

    const orgs = await listOrganizations(token)
    const currentOrg = orgs.find((o) => o.id === config.organizationId)

    console.log()
    console.log(`  ${pc.dim("User:")}         ${session.user.email}`)
    console.log(`  ${pc.dim("Organization:")} ${currentOrg?.name ?? pc.yellow("None")}`)
    console.log(`  ${pc.dim("API:")}          ${config.apiUrl}`)
    console.log()
  })
