import type { Endpoint } from "@usevon/types";
import { createResource } from "@/hooks/use-resource";

export type { Endpoint };

type EndpointsResponse = { endpoints: Endpoint[]; total: number };

export const useEndpoints = createResource<
  EndpointsResponse,
  Endpoint,
  "endpoints"
>("endpoints", "endpoints");
