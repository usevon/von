import type { InboundEndpoint } from "@usevon/types";
import { createResource } from "@/hooks/use-resource";

type InboundResponse = {
  endpoints: InboundEndpoint[];
  nextCursor: string | null;
};

export const useInbound = createResource<
  InboundResponse,
  InboundEndpoint,
  "endpoints"
>("inbound", "endpoints");

export type { InboundEndpoint } from "@usevon/types";
