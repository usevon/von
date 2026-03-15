import type { Endpoint } from "@usevon/types";
import { createResource } from "@/hooks/use-resource";

type EndpointsResponse = { endpoints: Endpoint[]; nextCursor: string | null };

export const useEndpoints = createResource<
  EndpointsResponse,
  Endpoint,
  "endpoints"
>("endpoints", "endpoints");

export type { Endpoint } from "@usevon/types";
