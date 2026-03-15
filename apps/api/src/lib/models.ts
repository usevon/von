import { t } from "elysia";

export const CursorPaginationQuery = t.Object({
  limit: t.Optional(t.Numeric({ default: 20, minimum: 1, maximum: 100 })),
  cursor: t.Optional(t.String({ maxLength: 256 })),
});

export const PaginationQuery = CursorPaginationQuery;

export const IdParam = t.Object({
  id: t.String({ format: "uuid" }),
});

export const ErrorResponse = t.Object({
  error: t.String(),
  code: t.Optional(t.String()),
});

export const SuccessResponse = t.Object({
  success: t.Boolean(),
});

/** Guard response presets for auth-protected routes. */
export const ReadGuard = {
  401: ErrorResponse,
  403: ErrorResponse,
} as const;

export const WriteGuard = {
  401: ErrorResponse,
  403: ErrorResponse,
  429: ErrorResponse,
} as const;

export type CursorPaginationQueryType = typeof CursorPaginationQuery.static;
export type PaginationQueryType = CursorPaginationQueryType;
export type IdParamType = typeof IdParam.static;
export type ErrorResponseType = typeof ErrorResponse.static;
export type SuccessResponseType = typeof SuccessResponse.static;
