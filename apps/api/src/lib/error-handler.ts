import { Elysia } from "elysia"

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

export const errorHandler = (isProd: boolean) =>
  new Elysia({ name: "error-handler" })
    .onError(({ code, error, set }) => {
      const status = errorStatusMap[code]
      if (status) {
        set.status = status
        const message = "message" in error ? error.message : String(error)
        return { error: status === 500 && isProd ? "Internal server error" : message }
      }

      console.error({ code, error: "message" in error ? error.message : String(error) })
      set.status = 500
      return { error: isProd ? "Internal server error" : String(error) }
    })
