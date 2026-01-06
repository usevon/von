import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { log } from "@clack/prompts";
import type { VonConfig } from "@/lib/types";

export type { VonConfig } from "@/lib/types";

const CONFIG_DIR = join(homedir(), ".von");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");

export const getConfigPath = (): string => CONFIG_FILE;

export const DEFAULT_DASHBOARD_URL = "https://app.usevon.com";
export const DEFAULT_TUNNEL_URL = "https://tunnel.usevon.com";

const DEFAULT_CONFIG: VonConfig = {
  dashboardUrl: DEFAULT_DASHBOARD_URL,
  tunnelUrl: DEFAULT_TUNNEL_URL,
};

const ensureConfigDir = (): void => {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
};

export const loadConfig = (): VonConfig => {
  ensureConfigDir();

  if (!existsSync(CONFIG_FILE)) {
    return { ...DEFAULT_CONFIG };
  }

  try {
    const raw = readFileSync(CONFIG_FILE, "utf-8");
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
};

export const saveConfig = (config: Partial<VonConfig>): void => {
  ensureConfigDir();
  const current = loadConfig();
  const updated = { ...current, ...config };
  writeFileSync(CONFIG_FILE, JSON.stringify(updated, null, 2));
  chmodSync(CONFIG_FILE, 0o600);
};

export const clearConfig = (): void => {
  ensureConfigDir();
  writeFileSync(CONFIG_FILE, JSON.stringify(DEFAULT_CONFIG, null, 2));
  chmodSync(CONFIG_FILE, 0o600);
};

export const requireAuth = (): { token: string; config: VonConfig } => {
  const config = loadConfig();
  if (!config.token) {
    log.warn("Not logged in, run 'von login' first");
    process.exit(1);
  }
  return { token: config.token, config };
};
