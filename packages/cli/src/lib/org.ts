import * as p from "@clack/prompts"
import pc from "picocolors"
import { saveConfig } from "./config"
import { setActiveOrganization, type Organization } from "./api"

type SelectOrgOptions = {
  orgs: Organization[]
  token: string
  currentOrgId?: string
  exitOnCancel?: boolean
}

export const selectAndSetOrganization = async (
  options: SelectOrgOptions
): Promise<boolean> => {
  const choice = await p.select({
    message: "Select an organization:",
    options: options.orgs.map((org) => ({
      value: org.id,
      label: org.name,
      hint: org.id === options.currentOrgId ? "current" : org.slug,
    })),
  })

  if (p.isCancel(choice)) {
    if (options.exitOnCancel) {
      p.cancel("Cancelled")
      process.exit(0)
    }
    return false
  }

  if (choice === options.currentOrgId) {
    const name = options.orgs.find((o) => o.id === choice)?.name
    p.log.info(`Already using ${pc.cyan(name)}`)
    return true
  }

  await setActiveOrganization(options.token, choice as string)
  saveConfig({ organizationId: choice as string })
  const selected = options.orgs.find((o) => o.id === choice)
  p.log.success(`Organization set to ${pc.cyan(selected?.name)}`)
  return true
}
