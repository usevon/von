import pino from "pino"
import pinoPretty from "pino-pretty"
import type { Logger } from "pino"

export type LogLevel = "fatal" | "error" | "warn" | "info" | "debug" | "trace"

export type LoggerOptions = {
  level?: LogLevel
  name?: string
  pretty?: boolean
}

export const createLogger = (options: LoggerOptions = {}): Logger => {
  const usePretty = options.pretty ?? process.env.NODE_ENV === "development"
  const stream = usePretty ? pinoPretty({ colorize: true }) : undefined

  return pino({ level: options.level ?? "info", name: options.name }, stream)
}

export const logger = createLogger({ name: "von" })

export type { Logger }
