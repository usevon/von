import { log } from "@clack/prompts";

export const validatePort = (portStr: string): number | null => {
  const port = Number.parseInt(portStr, 10);
  if (Number.isNaN(port) || port < 1 || port > 65_535) {
    log.error(`Invalid port: ${portStr}`);
    return null;
  }
  return port;
};

// Turns thrown values into one readable line instead of a stack trace
export const formatError = (err: unknown): string => {
  if (!(err instanceof Error)) {
    return "Unknown error";
  }
  if (err.name === "TimeoutError") {
    return "Request timed out";
  }
  // Fetch wraps network failures in a generic error whose cause is clearer
  if (err.cause instanceof Error && err.cause.message) {
    return err.cause.message;
  }
  return err.message;
};
