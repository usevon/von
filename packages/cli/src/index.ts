#!/usr/bin/env node
import { Command } from "commander"
import * as p from "@clack/prompts"
import pkg from "../package.json"
import { login } from "@/commands/login"
import { logout } from "@/commands/logout"
import { switchOrg } from "@/commands/switch"
import { status } from "@/commands/status"
import { dev } from "@/commands/dev"
import { rotate } from "@/commands/rotate"

const program = new Command("von")
  .description("Von CLI - Webhooks infrastructure that just works")
  .version(pkg.version, "-V, --version")
  .configureOutput({
    outputError: (str) => {
      const msg = str.replace(/^error: /, "").trim()
      p.log.error(msg)
    },
  })
  .action(() => {
    program.outputHelp()
  })

program.addCommand(login)
program.addCommand(logout)
program.addCommand(switchOrg)
program.addCommand(status)
program.addCommand(dev)
program.addCommand(rotate)

program.parse()