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

export type DeliveryResponse = {
  status?: number;
  durationMs: number;
  error?: string;
};

export type Delivery = {
  id: string;
  eventId: string;
  endpointId: string;
  status: string;
  attempts: number;
  lastAttemptAt: string | null;
  response: DeliveryResponse | null;
  createdAt: string;
};

export type DeliveryList = {
  deliveries: Delivery[];
  nextCursor: string | null;
};

export type DeliveryQuery = PaginationQuery & {
  status?: string;
  endpointId?: string;
  from?: string;
  to?: string;
};

export type DeliveryAttempt = {
  id: string;
  deliveryId: string;
  eventId: string;
  endpointId: string;
  attemptNumber: number;
  outcome: string;
  isFinal: boolean;
  httpStatus: number | null;
  error: string | null;
  durationMs: number;
  startedAt: string;
  finishedAt: string;
  createdAt: string;
};

export type DeliveryAttemptList = {
  attempts: DeliveryAttempt[];
  nextCursor: string | null;
};

export type DeliveryAttemptQuery = PaginationQuery & {
  sort?: "asc" | "desc";
};

export type ReplayEventBody = {
  endpointIds?: string[];
};

export type ReplayResult = {
  replayed: number;
  deliveryIds: string[];
};

export type ReplayBulkBody = {
  since: string;
  status?: string;
  endpointId?: string;
};

export type ReplayBulkResult = {
  replayed: number;
};

export type InboundEndpointStatus = "active" | "paused" | "disabled";

export type InboundEndpoint = {
  id: string;
  name: string | null;
  provider: string | null;
  secret: string;
  forwardUrl: string;
  status: string;
  maxAttempts: number;
  timeoutMs: number;
  lastSuccessAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateInboundEndpointBody = {
  forwardUrl: string;
  name?: string;
  provider?: string;
  maxAttempts?: number;
  timeoutMs?: number;
  status?: InboundEndpointStatus;
};

export type UpdateInboundEndpointBody = {
  forwardUrl?: string;
  name?: string;
  provider?: string;
  maxAttempts?: number;
  timeoutMs?: number;
  status?: InboundEndpointStatus;
};

export type InboundEndpointList = {
  endpoints: InboundEndpoint[];
  nextCursor: string | null;
};

export type InboundDeliveryResponse = {
  status?: number;
  durationMs: number;
  error?: string;
};

export type InboundDelivery = {
  id: string;
  payload: unknown;
  headers: Record<string, string> | null;
  status: string;
  forwardedAt: string | null;
  response: InboundDeliveryResponse | null;
  createdAt: string;
};

export type VersionTransform = {
  rename?: Record<string, string>;
  remove?: string[];
  defaults?: Record<string, unknown>;
};

/** Transform mappings keyed by event type. */
export type VersionTransforms = Record<string, VersionTransform>;

export type WebhookVersion = {
  id: string;
  version: string;
  transforms: VersionTransforms;
  createdAt: string;
  updatedAt: string;
};

export type CreateVersionBody = {
  version: string;
  transforms: VersionTransforms;
};

export type UpdateVersionBody = {
  transforms: VersionTransforms;
};

export type WebhookVersionList = {
  versions: WebhookVersion[];
  nextCursor: string | null;
};
