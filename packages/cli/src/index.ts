#!/usr/bin/env node
import { Command } from "commander"
import { login } from "@/commands/login"
import { logout } from "@/commands/logout"
import { switchOrg } from "@/commands/switch"
import { dev } from "@/commands/dev"

const program = new Command("von")
  .description("Von CLI - Webhooks infrastructure that just works")
  .version("0.1.0", "-v, --version")

program.addCommand(login)
program.addCommand(logout)
program.addCommand(switchOrg)
program.addCommand(dev)

program.parse()
