#!/usr/bin/env node
import { Command } from "commander"
import { login, logout } from "./commands/login"
import { dev } from "./commands/dev"

const program = new Command("von")
  .description("Von CLI - Webhooks infrastructure that just works")
  .version("0.1.0")

program.addCommand(login)
program.addCommand(logout)
program.addCommand(dev)

program.parse()
