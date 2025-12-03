import { existsSync } from "fs"
import { resolve } from "path"

const envPath = resolve(import.meta.dir, "../.env")

if (!existsSync(envPath)) {
  console.error("ERROR: Missing .env file in apps/tunnel/")
  console.error("Tests must be run from apps/tunnel/ directory: cd apps/tunnel && bun test")
  process.exit(1)
}

const envFile = Bun.file(envPath)
const envContent = await envFile.text()

for (const line of envContent.split("\n")) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith("#")) continue
  const [key, ...valueParts] = trimmed.split("=")
  if (key) process.env[key] = valueParts.join("=")
}

process.env.NODE_ENV = "test"
