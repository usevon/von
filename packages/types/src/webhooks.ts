export type DeliveryResponse = {
  status?: number;
  durationMs: number;
  error?: string;
} | null;

export type DeliveryStatus =
  | "pending"
  | "delivered"
  | "failed"
  | "paused"
  | "skipped"
  | "circuit_open";

export type DeliveryAttemptOutcome = "success" | "failure" | "timeout";

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
  status: DeliveryStatus;
  attempts: number;
  lastAttemptAt: string | null;
  response: DeliveryResponse;
  createdAt: string;
};

export type WebhookDeliveryAttempt = {
  id: string;
  deliveryId: string;
  eventId: string;
  endpointId: string;
  attemptNumber: number;
  outcome: DeliveryAttemptOutcome;
  isFinal: boolean;
  httpStatus: number | null;
  error: string | null;
  durationMs: number;
  startedAt: string;
  finishedAt: string;
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
