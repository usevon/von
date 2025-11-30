import { Command } from "commander"
import * as p from "@clack/prompts"
import { clearConfig, requireAuth } from "@/lib/config"

export const logout = new Command("logout")
  .description("Log out of Von")
  .action(() => {
    if (!requireAuth(false)) {
      return
    }
    clearConfig()
    p.log.success("Logged out of Von")
  })
