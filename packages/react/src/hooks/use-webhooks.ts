import type { WebhookEvent } from "@usevon/types";
import { createResource } from "@/hooks/use-resource";

type WebhooksResponse = { events: WebhookEvent[]; nextCursor: string | null };

export const useWebhooks = createResource<
  WebhooksResponse,
  WebhookEvent,
  "events"
>("webhooks/events", "events");

export type { WebhookEvent } from "@usevon/types";
