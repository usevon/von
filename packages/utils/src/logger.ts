import pino from "pino"
import pinoPretty from "pino-pretty"
import type { Logger } from "pino"

export type LogLevel = "fatal" | "error" | "warn" | "info" | "debug" | "trace"

export type LoggerOptions = {
  level?: LogLevel
  name?: string
  pretty?: boolean
}

const REDACT_PATHS = [
  "*.token",
  "*.password",
  "*.secret",
  "*.authorization",
  "*.apiKey",
  "*.api_key",
  "*.accessToken",
  "*.access_token",
  "*.refreshToken",
  "*.refresh_token",
  "headers.authorization",
  "headers.cookie",
]

export const createLogger = (options: LoggerOptions = {}): Logger => {
  const usePretty = options.pretty ?? process.env.NODE_ENV === "development"
  const stream = usePretty ? pinoPretty({ colorize: true }) : undefined

  return pino(
    {
      level: options.level ?? "info",
      name: options.name,
      redact: { paths: REDACT_PATHS, censor: "[REDACTED]" },
    },
    stream
  )
}

export const logger = createLogger({ name: "von" })

export type { Logger }
