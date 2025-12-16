import { t, type Static } from "elysia"

export const PaginationQuery = t.Object({
  limit: t.Optional(t.Numeric({ default: 20, maximum: 100 })),
  offset: t.Optional(t.Numeric({ default: 0, minimum: 0 })),
})

export const IdParam = t.Object({
  id: t.String({ format: "uuid" }),
})

export const ErrorResponse = t.Object({
  error: t.String(),
  code: t.Optional(t.String()),
})

export const SuccessResponse = t.Object({
  success: t.Boolean(),
})

export type PaginationQueryType = Static<typeof PaginationQuery>
export type IdParamType = Static<typeof IdParam>
export type ErrorResponseType = Static<typeof ErrorResponse>
export type SuccessResponseType = Static<typeof SuccessResponse>
