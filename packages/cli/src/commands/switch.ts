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

    const orgs = await listOrganizations(token)

    if (orgs.length === 0) {
      s.stop("No organizations found")
      p.note("Create an organization in the dashboard first.", "Next steps")
      process.exit(1)
    }

    s.stop(`Found ${orgs.length} organization${orgs.length > 1 ? "s" : ""}`)

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

    await setActiveOrganization(token, orgChoice as string)
    saveConfig({ organizationId: orgChoice as string })

    const selected = orgs.find((o) => o.id === orgChoice)
    p.outro(pc.green(`Switched to ${pc.cyan(selected?.name || "Unknown")}`))
  })
