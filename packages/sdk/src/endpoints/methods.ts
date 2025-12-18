import type { Von } from "@/client";
import type {
  CreateEndpointParams,
  Endpoint,
  EndpointsResponse,
  UpdateEndpointParams,
} from "@/endpoints/types";
import { createCrudMethods } from "@/factory";

export const endpointsMethods = (client: Von) =>
  createCrudMethods<
    CreateEndpointParams,
    UpdateEndpointParams,
    Endpoint,
    EndpointsResponse
  >(client, "endpoints");
