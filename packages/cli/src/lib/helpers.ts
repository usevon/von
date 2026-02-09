import { log } from "@clack/prompts";

export const validatePort = (portStr: string): number | null => {
  const port = Number.parseInt(portStr, 10);
  if (Number.isNaN(port) || port < 1 || port > 65_535) {
    log.error(`Invalid port: ${portStr}`);
    return null;
  }
  return port;
};

export const formatError = (err: unknown): string =>
  err instanceof Error ? err.message : "Unknown error";
