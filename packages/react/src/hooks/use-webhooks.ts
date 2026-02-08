import type { WebhookEvent } from "@usevon/types";
import { createResource } from "@/hooks/use-resource";

export type { WebhookEvent };

type WebhooksResponse = { events: WebhookEvent[]; total: number };

export const useWebhooks = createResource<WebhooksResponse, WebhookEvent, "events">(
  "webhooks/events",
  "events"
);
