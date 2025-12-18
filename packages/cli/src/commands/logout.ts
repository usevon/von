import { log } from "@clack/prompts";
import { Command } from "commander";
import { clearConfig, loadConfig } from "@/lib/config";

export const logout = new Command("logout")
  .description("Log out of Von")
  .action(() => {
    const config = loadConfig();
    if (!config.token) {
      log.warn("Not logged in");
      return;
    }
    clearConfig();
    log.success("Logged out");
  });
