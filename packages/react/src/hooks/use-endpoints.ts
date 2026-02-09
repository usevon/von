import { createResource } from "@/hooks/use-resource";

type Endpoint = import("@usevon/types").Endpoint;

type EndpointsResponse = { endpoints: Endpoint[]; total: number };

export const useEndpoints = createResource<
  EndpointsResponse,
  Endpoint,
  "endpoints"
>("endpoints", "endpoints");

export type { Endpoint } from "@usevon/types";
