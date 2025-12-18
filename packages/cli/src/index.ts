#!/usr/bin/env node
import * as p from "@clack/prompts";
import { Command } from "commander";
import { dev } from "@/commands/dev";
import { login } from "@/commands/login";
import { logout } from "@/commands/logout";
import { rotate } from "@/commands/rotate";
import { status } from "@/commands/status";
import { switchOrg } from "@/commands/switch";
import pkg from "../package.json";

const ERROR_PREFIX = /^error: /;

const program = new Command("von")
  .description("Von CLI - Webhooks infrastructure that just works")
  .version(pkg.version, "-V, --version")
  .configureOutput({
    outputError: (str) => {
      const msg = str.replace(ERROR_PREFIX, "").trim();
      p.log.error(msg);
    },
  })
  .action(() => {
    program.outputHelp();
  });

program.addCommand(login);
program.addCommand(logout);
program.addCommand(switchOrg);
program.addCommand(status);
program.addCommand(dev);
program.addCommand(rotate);

program.parse();
