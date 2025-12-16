import { createErrorHandler } from "@usevon/utils/elysia"
import { createLogger } from "@usevon/utils/logger"

const log = createLogger({ name: "tunnel" })

export const errorHandler = (isProd: boolean) => createErrorHandler({ isProd, logger: log })
