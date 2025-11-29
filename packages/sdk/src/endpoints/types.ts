import { z } from 'zod'

export const CreateEndpointParamsSchema = z.object({
  url: z.string().url(),
  description: z.string().optional(),
  enabled: z.boolean().optional(),
  retryCount: z.number().min(0).max(10).optional(),
  timeoutMs: z.number().min(1000).max(60000).optional(),
})

export type CreateEndpointParams = z.infer<typeof CreateEndpointParamsSchema>

export const UpdateEndpointParamsSchema = z.object({
  url: z.string().url().optional(),
  description: z.string().optional(),
  enabled: z.boolean().optional(),
  retryCount: z.number().min(0).max(10).optional(),
  timeoutMs: z.number().min(1000).max(60000).optional(),
})

export type UpdateEndpointParams = z.infer<typeof UpdateEndpointParamsSchema>

export const EndpointSchema = z.object({
  id: z.string(),
  url: z.string(),
  secret: z.string(),
  description: z.string().nullable(),
  enabled: z.boolean(),
  retryCount: z.number(),
  timeoutMs: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type Endpoint = z.infer<typeof EndpointSchema>

export const EndpointsResponseSchema = z.object({
  endpoints: z.array(EndpointSchema),
  total: z.number(),
})

export type EndpointsResponse = z.infer<typeof EndpointsResponseSchema>
