import { Command } from "commander"
import * as p from "@clack/prompts"
import pc from "picocolors"
import open from "open"
import { loadConfig, saveConfig } from "@/lib/config"
import {
  requestDeviceCode,
  pollDeviceToken,
  getSession,
  listOrganizations,
  setActiveOrganization,
} from "@/lib/api"

export const login = new Command("login")
  .description("Authenticate with Von")
  .option("-l, --local", "Use local development URLs (localhost:8080)")
  .option("--api-url <url>", "Custom API URL")
  .option("--tunnel-url <url>", "Custom tunnel URL")
  .option("-f, --force", "Force re-login even if already authenticated")
  .action(async (options) => {
    p.intro(pc.cyan("Von CLI Login"))

    const config = loadConfig()

    // Check if already logged in
    if (config.token && !options.force) {
      const session = await getSession(config.token).catch(() => null)
      if (session) {
        p.log.info(`Already logged in as ${pc.cyan(session.user.email)}`)
        p.outro(`Use ${pc.dim("von login --force")} to re-authenticate`)
        return
      }
    }

    if (options.local) {
      saveConfig({
        apiUrl: "http://localhost:8080",
        tunnelUrl: "http://localhost:8081",
      })
      p.log.info("Using local development URLs")
    } else if (options.apiUrl) {
      saveConfig({
        apiUrl: options.apiUrl,
        tunnelUrl: options.tunnelUrl || options.apiUrl,
      })
    } else {
      const instanceType = await p.select({
        message: "How are you connecting to Von?",
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
          placeholder: "http://localhost:8080",
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
          placeholder: "http://localhost:8080",
          initialValue: apiUrl as string,
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
        p.log.info("No organizations found")
        p.outro(`Create one at ${pc.cyan("app.usevon.com")}`)
        return
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
