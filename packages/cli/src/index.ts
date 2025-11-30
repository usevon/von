#!/usr/bin/env node
import { Command } from "commander"
import { login, logout, switchOrg } from "@/commands/login"
import { dev } from "@/commands/dev"

const program = new Command("von")
  .description("Von CLI - Webhooks infrastructure that just works")
  .version("0.1.0", "-v, --version")

program.addCommand(login)
program.addCommand(logout)
program.addCommand(switchOrg)
program.addCommand(dev)

program.parse()
