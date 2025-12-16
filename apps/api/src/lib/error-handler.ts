import { createErrorHandler } from "@usevon/utils/elysia"

export const errorHandler = (isProd: boolean) => createErrorHandler({ isProd })
