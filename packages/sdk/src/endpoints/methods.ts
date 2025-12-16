import type { Von } from "@/client"
import { createCrudMethods } from "@/factory"
import type {
  CreateEndpointParams,
  UpdateEndpointParams,
  Endpoint,
  EndpointsResponse,
} from "@/endpoints/types"

export const endpointsMethods = (client: Von) =>
  createCrudMethods<CreateEndpointParams, UpdateEndpointParams, Endpoint, EndpointsResponse>(
    client,
    "endpoints"
  )
