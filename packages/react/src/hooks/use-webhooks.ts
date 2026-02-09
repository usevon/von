import { createResource } from "@/hooks/use-resource";

type WebhookEvent = import("@usevon/types").WebhookEvent;

type WebhooksResponse = { events: WebhookEvent[]; total: number };

export const useWebhooks = createResource<
  WebhooksResponse,
  WebhookEvent,
  "events"
>("webhooks/events", "events");

export type { WebhookEvent } from "@usevon/types";
