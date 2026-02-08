export type EndpointStatus = "active" | "paused" | "disabled";

export type Endpoint = {
  id: string;
  url: string;
  description: string | null;
  secret: string;
  status: EndpointStatus;
  version: string | null;
  retryCount: number;
  timeoutMs: number;
  events: string[] | null;
  lastSuccessAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateEndpoint = {
  url: string;
  description?: string;
  status?: EndpointStatus;
  version?: string;
  retryCount?: number;
  timeoutMs?: number;
  events?: string[];
};

export type UpdateEndpoint = {
  url?: string;
  description?: string;
  status?: EndpointStatus;
  version?: string | null;
  retryCount?: number;
  timeoutMs?: number;
  events?: string[] | null;
};
