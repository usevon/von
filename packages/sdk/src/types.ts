import { z } from 'zod'

export const VonConfigSchema = z.object({
  apiKey: z.string().optional(),
  baseUrl: z.string().optional(),
})

export type VonConfig = z.infer<typeof VonConfigSchema>

export const PaginationParamsSchema = z.object({
  limit: z.number().min(1).max(100).optional(),
  offset: z.number().min(0).optional(),
})

export type PaginationParams = z.infer<typeof PaginationParamsSchema>

export type PaginatedResponse<T> = {
  data: T[]
  total: number
}
