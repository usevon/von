import type { Von } from "@/client";
import { createCrudMethods } from "@/factory";
import type {
  CreateInboundParams,
  InboundEndpoint,
  InboundEndpointsResponse,
  UpdateInboundParams,
} from "@/inbound/types";

export const inboundMethods = (client: Von) =>
  createCrudMethods<
    CreateInboundParams,
    UpdateInboundParams,
    InboundEndpoint,
    InboundEndpointsResponse
  >(client, "inbound");
