import pino from "pino"
import pretty from "pino-pretty"
import type { Logger } from "pino"

export type ElysiaLoggerOptions = {
  level?: "fatal" | "error" | "warn" | "info" | "debug" | "trace"
  pretty?: boolean
}

export const createLogger = (options: ElysiaLoggerOptions = {}): Logger => {
  const stream = options.pretty
    ? pretty({ colorize: true })
    : undefined

  return pino({ level: options.level ?? "info" }, stream)
}

export type { Logger }
