import type { InboundEndpoint } from "@usevon/types";
import { createResource } from "@/hooks/use-resource";

export type { InboundEndpoint };

type InboundResponse = { endpoints: InboundEndpoint[]; total: number };

export const useInbound = createResource<InboundResponse, InboundEndpoint, "endpoints">(
  "inbound",
  "endpoints"
);
