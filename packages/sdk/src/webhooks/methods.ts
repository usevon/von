import type { Von } from "@/client";
import type { PaginationParams } from "@/types";
import type {
  SendBatchParams,
  SendBatchResponse,
  SendWebhookParams,
  WebhookEvent,
  WebhookEventsResponse,
} from "@/webhooks/types";

export const webhooksMethods = (client: Von) => ({
  send: (params: SendWebhookParams) =>
    client.post<WebhookEvent>("/webhooks", params),

  sendBatch: (params: SendBatchParams) =>
    client.post<SendBatchResponse>("/webhooks/batch", params),

  list: (params?: PaginationParams) => {
    const searchParams = new URLSearchParams();
    if (params?.limit) {
      searchParams.set("limit", String(params.limit));
    }
    if (params?.offset) {
      searchParams.set("offset", String(params.offset));
    }
    const query = searchParams.toString();
    return client.get<WebhookEventsResponse>(
      `/webhooks/events${query ? `?${query}` : ""}`
    );
  },

  get: (id: string) => client.get<WebhookEvent>(`/webhooks/events/${id}`),
});
