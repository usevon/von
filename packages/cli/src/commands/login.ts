import {
  cancel,
  intro,
  isCancel,
  log,
  note,
  outro,
  select,
  spinner,
  text,
} from "@clack/prompts";
import { Command } from "commander";
import open from "open";
import pc from "picocolors";
import {
  getSession,
  listOrganizations,
  pollDeviceToken,
  requestDeviceCode,
} from "@/lib/api";
import { DEFAULT_API_URL, loadConfig, saveConfig } from "@/lib/config";
import { formatError } from "@/lib/helpers";
import { selectAndSetOrganization } from "@/lib/org";

export const login = new Command("login")
  .description("Authenticate with Von")
  .option("-l, --local", "Use local development URLs (localhost:8080)")
  .option("--api-url <url>", "Custom API URL")
  .option("-f, --force", "Force re-login even if already authenticated")
  .action(async (options) => {
    intro(pc.cyan("Von CLI Login"));

    // Update URLs first before checking token
    if (options.local) {
      saveConfig({
        apiUrl: "http://localhost:8080",
      });
      log.info("Using local development URLs");
    } else if (options.apiUrl) {
      saveConfig({
        apiUrl: options.apiUrl,
      });
    }

    const config = loadConfig();

    if (config.token && !options.force) {
      const session = await getSession(config.token).catch(() => null);
      if (session) {
        log.info(`Already logged in as ${pc.cyan(session.user.email)}`);
        outro(`Use ${pc.dim("von login --force")} to re-authenticate`);
        return;
      }
    }

    // If no URL options provided, prompt for instance type
    if (!(options.local || options.apiUrl)) {
      const instanceType = await select({
        message: "How are you connecting to Von?",
        options: [
          {
            value: "hosted",
            label: "Hosted (api.usevon.com)",
            hint: "recommended",
          },
          { value: "self-hosted", label: "Self-hosted" },
        ],
      });

      if (isCancel(instanceType)) {
        cancel("Login cancelled");
        process.exit(0);
      }

      if (instanceType === "hosted") {
        saveConfig({
          apiUrl: DEFAULT_API_URL,
        });
      } else if (instanceType === "self-hosted") {
        const apiUrl = await text({
          message: "API URL:",
          placeholder: "http://localhost:8080",
          validate: (v) => {
            if (!v) {
              return "API URL is required";
            }
            if (!v.startsWith("http")) {
              return "Must be a valid URL";
            }
          },
        });

        if (isCancel(apiUrl)) {
          cancel("Login cancelled");
          process.exit(0);
        }

        saveConfig({
          apiUrl: apiUrl as string,
        });
      }
    }

    const s = spinner();
    s.start("Requesting device authorization...");

    try {
      const deviceData = await requestDeviceCode();
      s.stop("Device code received");

      note(
        `Code: ${pc.bold(pc.cyan(deviceData.user_code))}\n\nOpening browser to: ${deviceData.verification_uri}`,
        "Enter this code in your browser"
      );

      const urlToOpen =
        deviceData.verification_uri_complete || deviceData.verification_uri;
      await open(urlToOpen);

      s.start("Waiting for authorization...");

      const token = await waitForToken(
        deviceData.device_code,
        deviceData.interval
      );
      s.stop("Authorized");
      saveConfig({ token });

      s.start("Fetching user info...");

      const session = await getSession(token);
      if (!session) {
        s.stop("Failed to get session");
        cancel("Could not fetch user session");
        return;
      }

      s.stop(`Logged in as ${pc.cyan(session.user.email)}`);

      const orgs = await listOrganizations(token);

      if (orgs.length === 0) {
        log.info("No organizations found");
        outro(`Create one at ${pc.cyan("app.usevon.com")}`);
        return;
      }

      await selectAndSetOrganization({ orgs, token });

      outro(pc.green("Ready to use Von CLI!"));
    } catch (err) {
      s.stop("");
      cancel(`Login failed: ${formatError(err)}`);
    }
  });

const waitForToken = async (
  deviceCode: string,
  interval: number
): Promise<string> => {
  let pollingInterval = interval;

  while (true) {
    await new Promise((r) => setTimeout(r, pollingInterval * 1000));

    const result = await pollDeviceToken(deviceCode);

    if (result.access_token) {
      return result.access_token;
    }

    if (result.error) {
      switch (result.error) {
        case "authorization_pending":
          break;
        case "slow_down":
          pollingInterval += 5;
          break;
        case "access_denied":
          throw new Error("Access was denied by the user");
        case "expired_token":
          throw new Error("Device code expired. Please try again.");
        default:
          throw new Error(result.error_description || result.error);
      }
    }
  }
};
