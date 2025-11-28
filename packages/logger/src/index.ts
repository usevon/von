import pino from "pino"

export type LogLevel = "fatal" | "error" | "warn" | "info" | "debug" | "trace"

export type LoggerOptions = {
  level?: LogLevel
  name?: string
}

export const createLogger = (options: LoggerOptions = {}) => {
  return pino({
    level: options.level ?? "info",
    name: options.name,
    transport:
      process.env.NODE_ENV === "development"
        ? {
            target: "pino-pretty",
            options: {
              colorize: true,
            },
          }
        : undefined,
  })
}

export const logger = createLogger({ name: "von" })

export type Logger = ReturnType<typeof createLogger>
