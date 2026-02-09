import { createResource } from "@/hooks/use-resource";

type InboundEndpoint = import("@usevon/types").InboundEndpoint;

type InboundResponse = { endpoints: InboundEndpoint[]; total: number };

export const useInbound = createResource<
  InboundResponse,
  InboundEndpoint,
  "endpoints"
>("inbound", "endpoints");

export type { InboundEndpoint } from "@usevon/types";
