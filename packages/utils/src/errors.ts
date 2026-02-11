function createHttpError(status: number, defaultMessage: string) {
  return class extends Error {
    status = status;
    constructor(message = defaultMessage) {
      super(message);
      this.name = this.constructor.name;
    }
  };
}

export const UnauthorizedError = createHttpError(401, "Unauthorized");
export const NotFoundError = createHttpError(404, "Not found");
export const BadRequestError = createHttpError(400, "Bad request");
export const ForbiddenError = createHttpError(403, "Forbidden");
export const InternalServerError = createHttpError(
  500,
  "Internal server error"
);
