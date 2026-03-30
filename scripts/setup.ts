/**
 * Von local development setup script.
 *
 * Usage: bun setup
 *
 * Automates: Docker start, health checks, secret generation,
 * .env file creation, and database schema push.
 */

import { execSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const isTTY = process.stdout.isTTY ?? false;

const c = (code: string, text: string) =>
  isTTY ? `\x1b[${code}m${text}\x1b[0m` : text;

const log = console.log;
const step = (msg: string) => log(`\n${c("1", c("32", "▸"))} ${c("1", msg)}`);
const ok = (msg: string) => log(`  ${c("32", "✓")} ${msg}`);
const warn = (msg: string) => log(`  ${c("33", "!")} ${msg}`);
const fail = (msg: string) => log(`  ${c("31", "✗")} ${msg}`);

const ROOT = process.cwd();
const APPS = join(ROOT, "apps");

const run = (cmd: string) =>
  (
    execSync(cmd, { stdio: "pipe", encoding: "utf-8", cwd: ROOT }) as string
  ).trim();

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function checkPrerequisites() {
  step("Checking prerequisites");

  const bunVersion = run("bun --version");
  const [major, minor] = bunVersion.split(".").map(Number);
  if (major < 1 || (major === 1 && minor < 3)) {
    fail(`Bun >= 1.3.2 required (found ${bunVersion})`);
    process.exit(1);
  }
  ok(`Bun ${bunVersion}`);

  try {
    run("docker info");
    ok("Docker is running");
  } catch {
    fail("Docker is not running. Please start Docker Desktop and try again.");
    process.exit(1);
  }

  if (!existsSync(join(ROOT, "node_modules"))) {
    fail('node_modules not found. Run "bun install" first.');
    process.exit(1);
  }
  ok("node_modules present");
}

function startDocker() {
  step("Starting Docker containers");
  try {
    execSync("docker compose -f docker-compose.dev.yml down -v", {
      stdio: "pipe",
      cwd: ROOT,
    });
  } catch {
    // No existing containers to remove
  }
  execSync("docker compose -f docker-compose.dev.yml up -d", {
    stdio: "inherit",
    cwd: ROOT,
  });
}

async function waitForHealthy() {
  step("Waiting for containers to be healthy");

  const containers = ["von-postgres", "von-redis"];
  const timeout = 60_000;
  const start = Date.now();

  for (const name of containers) {
    while (Date.now() - start < timeout) {
      try {
        const status = run(
          `docker inspect --format={{.State.Health.Status}} ${name}`
        );
        if (status === "healthy") {
          ok(`${name} is healthy`);
          break;
        }
      } catch {
        // container may not exist yet
      }

      if (Date.now() - start >= timeout) {
        fail(`Timed out waiting for ${name} to become healthy`);
        process.exit(1);
      }

      await sleep(2000);
    }
  }
}

function generateSecrets() {
  step("Generating secrets");

  const authSecret = randomBytes(32).toString("base64url");
  const apiKeySigningSecret = randomBytes(32).toString("base64url");

  ok("BETTER_AUTH_SECRET generated");
  ok("API_KEY_SIGNING_SECRET generated");

  return { authSecret, apiKeySigningSecret };
}

function createEnvFiles(secrets: {
  authSecret: string;
  apiKeySigningSecret: string;
}) {
  step("Creating .env files");

  const apps = [
    {
      name: "api",
      replacements: {
        "BETTER_AUTH_SECRET=your-secret-key-min-32-characters-long": `BETTER_AUTH_SECRET=${secrets.authSecret}`,
        "# API_KEY_SIGNING_SECRET=your-api-key-signing-secret": `API_KEY_SIGNING_SECRET=${secrets.apiKeySigningSecret}`,
      },
    },
    { name: "dashboard" },
    { name: "worker" },
    { name: "docs" },
    { name: "site" },
  ] as const;

  for (const app of apps) {
    const envPath = join(APPS, app.name, ".env");
    const examplePath = join(APPS, app.name, ".env.example");

    if (existsSync(envPath)) {
      warn(`${app.name}/.env already exists, skipping`);
      continue;
    }

    if (!existsSync(examplePath)) {
      warn(`${app.name}/.env.example not found, skipping`);
      continue;
    }

    let content = readFileSync(examplePath, "utf-8");

    if ("replacements" in app) {
      for (const [placeholder, replacement] of Object.entries(
        app.replacements
      )) {
        content = content.replace(placeholder, replacement);
      }
    }

    writeFileSync(envPath, content);
    ok(`${app.name}/.env created`);
  }
}

function pushDatabase() {
  step("Pushing database schema");

  try {
    execSync("bun run --cwd apps/api db:push", { stdio: "pipe", cwd: ROOT });
    ok("Database schema pushed");
  } catch {
    warn("db:push failed — you may need to run it manually later");
  }
}

function printNextSteps() {
  log(`\n${c("1", c("32", "Setup complete!"))}\n`);
  log(`  ${c("1", "Start developing:")}  bun dev`);
  log(`  ${c("1", "Dashboard:")}         ${c("2", "http://localhost:3001")}`);
  log(`  ${c("1", "API:")}               ${c("2", "http://localhost:8080")}`);
  log("");
}

async function main() {
  log(`\n${c("1", "Von Development Setup")}`);

  checkPrerequisites();
  startDocker();
  await waitForHealthy();
  const secrets = generateSecrets();
  createEnvFiles(secrets);
  pushDatabase();
  printNextSteps();
}

main().catch((err) => {
  fail(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
