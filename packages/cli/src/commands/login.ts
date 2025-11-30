import { Command } from "commander"
import * as p from "@clack/prompts"
import pc from "picocolors"
import open from "open"
import { loadConfig, saveConfig, clearConfig } from "../lib/config"
import {
  requestDeviceCode,
  pollDeviceToken,
  getSession,
  listOrganizations,
  setActiveOrganization,
} from "../lib/api"

export const login = new Command("login")
  .description("Authenticate with Von")
  .action(async () => {
    p.intro(pc.cyan("Von CLI Login"))

    const config = loadConfig()

    if (!config.apiUrl || config.apiUrl === "https://api.usevon.com") {
      const instanceType = await p.select({
        message: "Which Von instance?",
        options: [
          { value: "hosted", label: "Hosted (api.usevon.com)", hint: "recommended" },
          { value: "self-hosted", label: "Self-hosted" },
        ],
      })

      if (p.isCancel(instanceType)) {
        p.cancel("Login cancelled")
        process.exit(0)
      }

      if (instanceType === "self-hosted") {
        const apiUrl = await p.text({
          message: "API URL:",
          placeholder: "https://api.yourdomain.com",
          validate: (v) => {
            if (!v) return "API URL is required"
            if (!v.startsWith("http")) return "Must be a valid URL"
          },
        })

        if (p.isCancel(apiUrl)) {
          p.cancel("Login cancelled")
          process.exit(0)
        }

        const tunnelUrl = await p.text({
          message: "Tunnel URL:",
          placeholder: "https://dev.yourdomain.com",
          validate: (v) => {
            if (!v) return "Tunnel URL is required"
            if (!v.startsWith("http")) return "Must be a valid URL"
          },
        })

        if (p.isCancel(tunnelUrl)) {
          p.cancel("Login cancelled")
          process.exit(0)
        }

        saveConfig({ apiUrl: apiUrl as string, tunnelUrl: tunnelUrl as string })
      }
    }

    const s = p.spinner()
    s.start("Requesting device authorization...")

    try {
      const deviceData = await requestDeviceCode()
      s.stop("Device code received")

      p.note(
        `Code: ${pc.bold(pc.cyan(deviceData.user_code))}\n\nOpening browser to: ${deviceData.verification_uri}`,
        "Enter this code in your browser"
      )

      const urlToOpen = deviceData.verification_uri_complete || deviceData.verification_uri
      await open(urlToOpen)

      s.start("Waiting for authorization...")

      const token = await waitForToken(deviceData.device_code, deviceData.interval)

      if (!token) {
        s.stop("Authorization failed")
        p.cancel("Failed to get access token")
        process.exit(1)
      }

      s.stop("Authorized")
      saveConfig({ token })

      s.start("Fetching user info...")

      const session = await getSession(token)
      if (!session) {
        s.stop("Failed to get session")
        p.cancel("Could not fetch user session")
        process.exit(1)
      }

      s.stop(`Logged in as ${pc.cyan(session.user.email)}`)

      const orgs = await listOrganizations(token)

      if (orgs.length === 0) {
        p.note("No organizations found. Create one in the dashboard.", "Next steps")
      } else if (orgs.length === 1) {
        await setActiveOrganization(token, orgs[0].id)
        saveConfig({ organizationId: orgs[0].id })
        p.log.success(`Organization set to ${pc.cyan(orgs[0].name)}`)
      } else {
        const orgChoice = await p.select({
          message: "Select an organization:",
          options: orgs.map((org) => ({
            value: org.id,
            label: org.name,
            hint: org.slug,
          })),
        })

        if (p.isCancel(orgChoice)) {
          p.log.warn("No organization selected")
        } else {
          await setActiveOrganization(token, orgChoice as string)
          saveConfig({ organizationId: orgChoice as string })
          const selected = orgs.find((o) => o.id === orgChoice)
          p.log.success(`Organization set to ${pc.cyan(selected?.name || "Unknown")}`)
        }
      }

      p.outro(pc.green("Ready to use Von CLI!"))
    } catch (err) {
      s.stop("Error")
      p.cancel(`Login failed: ${err instanceof Error ? err.message : "Unknown error"}`)
      process.exit(1)
    }
  })

export const logout = new Command("logout")
  .description("Log out of Von")
  .action(() => {
    clearConfig()
    p.intro(pc.cyan("Logged out of Von"))
    p.outro("Token and organization cleared")
  })

const waitForToken = async (
  deviceCode: string,
  interval: number
): Promise<string | null> => {
  let pollingInterval = interval

  while (true) {
    await sleep(pollingInterval * 1000)

    const result = await pollDeviceToken(deviceCode)

    if (result.access_token) {
      return result.access_token
    }

    if (result.error) {
      switch (result.error) {
        case "authorization_pending":
          break
        case "slow_down":
          pollingInterval += 5
          break
        case "access_denied":
          throw new Error("Access was denied by the user")
        case "expired_token":
          throw new Error("Device code expired. Please try again.")
        default:
          throw new Error(result.error_description || result.error)
      }
    }
  }
}

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms))
