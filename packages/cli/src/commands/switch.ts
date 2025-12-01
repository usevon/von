import { Command } from "commander"
import * as p from "@clack/prompts"
import pc from "picocolors"
import { saveConfig, requireAuth } from "@/lib/config"
import { listOrganizations, setActiveOrganization } from "@/lib/api"

export const switchOrg = new Command("switch")
  .description("Switch active organization")
  .action(async () => {
    const { token, config } = requireAuth()

    const s = p.spinner()
    s.start("Fetching organizations...")

    let orgs
    try {
      orgs = await listOrganizations(token)
    } catch {
      s.stop("Error")
      p.log.error(`Could not connect to ${pc.cyan(config.apiUrl)}`)
      p.outro("Is the server running?")
      process.exit(1)
    }

    if (orgs.length === 0) {
      s.stop()
      p.log.info("No organizations found")
      p.outro(`Create one at ${pc.cyan("app.usevon.com")}`)
      process.exit(1)
    }

    if (orgs.length === 1) {
      const org = orgs[0]
      if (org.id === config.organizationId) {
        s.stop(`Already using ${pc.cyan(org.name)}`)
        p.outro(`Use ${pc.dim("von switch")} after creating more orgs`)
      } else {
        s.stop(`Found ${pc.cyan(org.name)}`)
        await setActiveOrganization(token, org.id)
        saveConfig({ organizationId: org.id })
        p.outro(`Switched to ${pc.cyan(org.name)}`)
      }
      return
    }

    s.stop(`Found ${orgs.length} organizations`)

    const currentOrg = orgs.find((o) => o.id === config.organizationId)
    if (currentOrg) {
      p.log.info(`Current: ${pc.cyan(currentOrg.name)}`)
    }

    const orgChoice = await p.select({
      message: "Select an organization:",
      options: orgs.map((org) => ({
        value: org.id,
        label: org.name,
        hint: org.id === config.organizationId ? "current" : org.slug,
      })),
    })

    if (p.isCancel(orgChoice)) {
      p.cancel("Cancelled")
      process.exit(0)
    }

    const selected = orgs.find((o) => o.id === orgChoice)

    if (orgChoice === config.organizationId) {
      p.outro(`Already using ${pc.cyan(selected?.name)}`)
    } else {
      await setActiveOrganization(token, orgChoice as string)
      saveConfig({ organizationId: orgChoice as string })
      p.outro(`Switched to ${pc.cyan(selected?.name)}`)
    }
  })
