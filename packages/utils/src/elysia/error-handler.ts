import { Elysia } from "elysia"

type Logger = { error: (obj: unknown, msg: string) => void }

const errorStatusMap: Record<string, number> = {
  UnauthorizedError: 401,
  NotFoundError: 404,
  BadRequestError: 400,
  ForbiddenError: 403,
  ConflictError: 409,
  InternalServerError: 500,
  VALIDATION: 400,
  NOT_FOUND: 404,
}

export const createErrorHandler = (config: { isProd: boolean; logger?: Logger }) =>
  new Elysia({ name: "error-handler" }).onError(({ code, error, set }) => {
    const status = errorStatusMap[code]
    if (status) {
      set.status = status
      const message = "message" in error ? error.message : String(error)
      return { error: status === 500 && config.isProd ? "Internal server error" : message }
    }

    const logData = { code, error: "message" in error ? error.message : String(error) }
    config.logger ? config.logger.error(logData, "error") : console.error(logData)
    set.status = 500
    return { error: config.isProd ? "Internal server error" : String(error) }
  })
