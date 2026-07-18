/** Wire types for the Von HTTP API, hand written so the public surface stays curated. */

export type EndpointStatus = "active" | "paused" | "disabled";

export type Endpoint = {
  id: string;
  url: string;
  description: string | null;
  status: EndpointStatus;
  version: string | null;
  maxAttempts: number;
  timeoutMs: number;
  events: string[] | null;
  lastSuccessAt: string | null;
  createdAt: string;
  updatedAt: string;
};

/** The plaintext signing secret is returned once at creation and never read back. */
export type EndpointWithSecret = Endpoint & { secret: string };

export type CreateEndpointBody = {
  url: string;
  description?: string;
  status?: EndpointStatus;
  version?: string;
  maxAttempts?: number;
  timeoutMs?: number;
  events?: string[];
};

/** Null on version or events clears the stored value, absent leaves it untouched. */
export type UpdateEndpointBody = {
  url?: string;
  description?: string;
  status?: EndpointStatus;
  version?: string | null;
  maxAttempts?: number;
  timeoutMs?: number;
  events?: string[] | null;
};

export type EndpointList = {
  endpoints: Endpoint[];
  nextCursor: string | null;
};

export type TestEndpointBody = {
  payload?: unknown;
  eventType?: string;
};

export type TestEndpointResponse = {
  eventId: string;
  deliveryId: string;
};

export type RotateSecretResponse = {
  secret: string;
  previousSecret: string;
};

export type SuccessResponse = {
  success: boolean;
};

export type PaginationQuery = {
  limit?: number;
  cursor?: string;
};

export type SendEventBody = {
  eventType: string;
  payload: unknown;
  idempotencyKey?: string;
  endpointIds?: string[];
};

export type SendBatchBody = {
  events: SendEventBody[];
};

export type WebhookEvent = {
  id: string;
  eventType: string;
  payload: unknown;
  idempotencyKey: string | null;
  createdAt: string;
};

export type BatchResult = {
  created: number;
  events: WebhookEvent[];
};

export type WebhookEventList = {
  events: WebhookEvent[];
  nextCursor: string | null;
};

export type WebhookEventQuery = PaginationQuery & {
  eventTypes?: string[];
  from?: string;
  to?: string;
  sort?: "asc" | "desc";
};
