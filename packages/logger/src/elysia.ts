import { logger as elysiaLogger } from "@bogeychan/elysia-logger"

export type ElysiaLoggerOptions = {
  level?: "fatal" | "error" | "warn" | "info" | "debug" | "trace"
  autoLogging?: boolean
}

export const createElysiaLogger = (options: ElysiaLoggerOptions = {}) => {
  return elysiaLogger({
    level: options.level ?? "info",
    autoLogging: options.autoLogging ?? true,
  })
}

export { elysiaLogger }
