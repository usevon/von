export class UnauthorizedError extends Error {
  status = 401;
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class NotFoundError extends Error {
  status = 404;
  constructor(message = "Not found") {
    super(message);
    this.name = "NotFoundError";
  }
}

export class BadRequestError extends Error {
  status = 400;
  constructor(message = "Bad request") {
    super(message);
    this.name = "BadRequestError";
  }
}

export class InternalServerError extends Error {
  status = 500;
  constructor(message = "Internal server error") {
    super(message);
    this.name = "InternalServerError";
  }
}
