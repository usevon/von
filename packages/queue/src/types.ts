export type DeliveryEndpoint = {
  id: string;
  url: string;
  secret: string;
  previousSecret?: string | null;
  timeoutMs: number;
  maxAttempts: number;
  version: string | null;
  events: string[] | null;
};

export type WebhookDeliveryJob = {
  deliveryId: string;
  eventId: string;
  payload: string;
  eventType: string;
  endpoint: DeliveryEndpoint;
  organizationId: string;
  plan: string;
};

export type InboundForwardingJob = {
  deliveryId: string;
  organizationId: string;
  plan: string;
  endpoint: {
    id: string;
    forwardUrl: string;
    secret: string;
    previousSecret?: string | null;
    timeoutMs: number;
    maxAttempts: number;
  };
  payload: string;
  headers: string;
};

export type QueueName = "webhook-delivery" | "inbound-forwarding";
