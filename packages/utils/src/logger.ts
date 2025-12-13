import pino from "pino"
import pretty from "pino-pretty"

export type LogLevel = "fatal" | "error" | "warn" | "info" | "debug" | "trace"

export type LoggerOptions = {
  level?: LogLevel
  name?: string
}

export const createLogger = (options: LoggerOptions = {}) => {
  const stream = process.env.NODE_ENV === "development"
    ? pretty({ colorize: true })
    : undefined

  return pino({ level: options.level ?? "info", name: options.name }, stream)
}

export const logger = createLogger({ name: "von" })

export type Logger = ReturnType<typeof createLogger>
