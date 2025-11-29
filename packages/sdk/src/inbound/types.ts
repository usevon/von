import { z } from 'zod'

export const CreateInboundParamsSchema = z.object({
  name: z.string().optional(),
  provider: z.string().optional(),
  forwardUrl: z.string().url(),
  enabled: z.boolean().optional(),
})

export type CreateInboundParams = z.infer<typeof CreateInboundParamsSchema>

export const UpdateInboundParamsSchema = z.object({
  name: z.string().optional(),
  provider: z.string().optional(),
  forwardUrl: z.string().url().optional(),
  enabled: z.boolean().optional(),
})

export type UpdateInboundParams = z.infer<typeof UpdateInboundParamsSchema>

export const InboundEndpointSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  provider: z.string().nullable(),
  secret: z.string(),
  forwardUrl: z.string(),
  enabled: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type InboundEndpoint = z.infer<typeof InboundEndpointSchema>

export const InboundEndpointsResponseSchema = z.object({
  inboundEndpoints: z.array(InboundEndpointSchema),
  total: z.number(),
})

export type InboundEndpointsResponse = z.infer<typeof InboundEndpointsResponseSchema>
