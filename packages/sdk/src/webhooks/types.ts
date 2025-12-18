export type SendWebhookParams = {
  eventType: string;
  payload: unknown;
  idempotencyKey?: string;
  endpointIds?: string[];
};

export type SendBatchParams = {
  events: SendWebhookParams[];
};

export type WebhookEvent = {
  id: string;
  eventType: string;
  payload: unknown;
  idempotencyKey: string | null;
  status: string;
  createdAt: string;
};

export type WebhookEventsResponse = {
  events: WebhookEvent[];
  total: number;
};

export type SendBatchResponse = {
  created: number;
  events: WebhookEvent[];
};
