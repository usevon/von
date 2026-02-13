export type DeliveryResponse = {
  status?: number;
  durationMs: number;
  error?: string;
} | null;

export type WebhookEvent = {
  id: string;
  eventType: string;
  payload: unknown;
  idempotencyKey: string | null;
  createdAt: string;
};

export type WebhookDelivery = {
  id: string;
  eventId: string;
  endpointId: string;
  status: string;
  attempts: number;
  lastAttemptAt: string | null;
  response: DeliveryResponse;
  createdAt: string;
};

export type SendEvent = {
  eventType: string;
  payload: unknown;
  idempotencyKey?: string;
  endpointIds?: string[];
};

export type SendBatch = {
  events: SendEvent[];
};
