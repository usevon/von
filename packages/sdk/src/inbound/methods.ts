import type { Von } from "@/client"
import { createCrudMethods } from "@/factory"
import type {
  CreateInboundParams,
  UpdateInboundParams,
  InboundEndpoint,
  InboundEndpointsResponse,
} from "@/inbound/types"

export const inboundMethods = (client: Von) =>
  createCrudMethods<CreateInboundParams, UpdateInboundParams, InboundEndpoint, InboundEndpointsResponse>(
    client,
    "inbound"
  )
