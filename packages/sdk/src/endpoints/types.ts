export type CreateEndpointParams = {
  url: string;
  description?: string;
  enabled?: boolean;
  version?: string;
  retryCount?: number;
  timeoutMs?: number;
  events?: string[];
};

export type UpdateEndpointParams = {
  url?: string;
  description?: string;
  enabled?: boolean;
  version?: string | null;
  retryCount?: number;
  timeoutMs?: number;
  events?: string[] | null;
};

export type Endpoint = {
  id: string;
  url: string;
  secret: string;
  description: string | null;
  enabled: boolean;
  version: string | null;
  retryCount: number;
  timeoutMs: number;
  events: string[] | null;
  createdAt: string;
  updatedAt: string;
};

export type EndpointsResponse = {
  endpoints: Endpoint[];
  total: number;
};
