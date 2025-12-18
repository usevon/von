import { log, note, outro } from "@clack/prompts";
import { Command } from "commander";
import pc from "picocolors";
import { getSession, listOrganizations } from "@/lib/api";
import { loadConfig } from "@/lib/config";

export const status = new Command("status")
  .description("Show current status")
  .action(async () => {
    const config = loadConfig();
    if (!config.token) {
      log.warn("Not logged in");
      return;
    }

    const session = await getSession(config.token);
    if (!session) {
      log.warn("Session expired, run 'von login' to re-authenticate");
      return;
    }

    const orgs = await listOrganizations(config.token);
    const currentOrg = orgs.find((o) => o.id === config.organizationId);

    note(
      [
        `${pc.dim("User:")}         ${pc.cyan(session.user.email)}`,
        `${pc.dim("Organization:")} ${currentOrg ? pc.cyan(currentOrg.name) : pc.yellow("None")}`,
        `${pc.dim("API:")}          ${pc.dim(config.apiUrl)}`,
      ].join("\n"),
      "Status"
    );
    outro(`Use ${pc.dim("von logout")} to sign out`);
  });
