import { t } from "elysia";

export const PaginationQuery = t.Object({
  limit: t.Optional(t.Numeric({ default: 20, maximum: 100 })),
  offset: t.Optional(t.Numeric({ default: 0, minimum: 0 })),
});

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

export type PaginationQueryType = typeof PaginationQuery.static;
export type IdParamType = typeof IdParam.static;
export type ErrorResponseType = typeof ErrorResponse.static;
export type SuccessResponseType = typeof SuccessResponse.static;
