import { createResource } from "@/hooks/use-resource";

export type WebhookEvent = {
  id: string;
  eventType: string;
  payload: unknown;
  idempotencyKey: string | null;
  status: string;
  createdAt: string;
};

type WebhooksResponse = { events: WebhookEvent[] };

export const useWebhooks = createResource<WebhooksResponse, WebhookEvent, "events">(
  "webhooks/events",
  "events"
);
