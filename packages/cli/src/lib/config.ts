import { homedir } from "node:os"
import { join } from "node:path"
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import * as p from "@clack/prompts"

export type VonConfig = {
  apiUrl: string
  tunnelUrl: string
  token?: string
  organizationId?: string
}

const CONFIG_DIR = join(homedir(), ".von")
const CONFIG_FILE = join(CONFIG_DIR, "config.json")

export const getConfigPath = (): string => CONFIG_FILE

const DEFAULT_CONFIG: VonConfig = {
  apiUrl: "https://api.usevon.com",
  tunnelUrl: "https://tunnel.usevon.com",
}

export const ensureConfigDir = (): void => {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true })
  }
}

export const loadConfig = (): VonConfig => {
  ensureConfigDir()

  if (!existsSync(CONFIG_FILE)) {
    return { ...DEFAULT_CONFIG }
  }

  try {
    const raw = readFileSync(CONFIG_FILE, "utf-8")
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULT_CONFIG }
  }
}

export const saveConfig = (config: Partial<VonConfig>): void => {
  ensureConfigDir()
  const current = loadConfig()
  const updated = { ...current, ...config }
  writeFileSync(CONFIG_FILE, JSON.stringify(updated, null, 2))
}

export const clearConfig = (): void => {
  ensureConfigDir()
  writeFileSync(CONFIG_FILE, JSON.stringify(DEFAULT_CONFIG, null, 2))
}

export function requireAuth(exit?: true): { token: string; config: VonConfig }
export function requireAuth(exit: false): { token: string; config: VonConfig } | null
export function requireAuth(exit: boolean = true): { token: string; config: VonConfig } | null {
  const config = loadConfig()
  if (!config.token) {
    p.log.warn("Not logged in, run 'von login' first")
    if (exit) process.exit(1)
    return null
  }
  return { token: config.token, config }
}
