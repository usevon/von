import { treaty } from "@elysiajs/eden";
import type { App } from "@usevon/api";

export { verifyWebhook, WebhookVerificationError } from "@/verify";

export type VonConfig = {
  baseUrl?: string;
  apiKey?: string;
  autoIdempotency?: boolean;
};

export type SendOptions = {
  idempotencyKey?: string;
  endpointIds?: string[];
};

export type BatchEvent = {
  eventType: string;
  payload: unknown;
  idempotencyKey?: string;
  endpointIds?: string[];
};

/**
 * Von SDK client using Eden Treaty for type-safe API calls.
 *
 * @example
 * ```ts
 * import { Von } from "@usevon/sdk";
 *
 * const von = new Von({ apiKey: "von_xxx" });
 *
 * // Send an event, durable and exactly-once by default
 * await von.send("order.created", { orderId: 123 });
 *
 * // Create endpoint
 * const { data, error } = await von.endpoints.post({
 *   url: "https://example.com/webhook",
 * });
 *
 * // Raw type-safe API surface stays available
 * await von.webhooks.post({ eventType: "order.created", payload: {} });
 * ```
 */
export class Von {
  readonly endpoints;
  readonly webhooks;
  readonly inbound;
  readonly versions;
  private readonly autoIdempotency: boolean;

  constructor(config?: VonConfig) {
    const baseUrl =
      config?.baseUrl ??
      (typeof process !== "undefined" ? process.env.VON_BASE_URL : undefined) ??
      "http://localhost:8080";
    const apiKey =
      config?.apiKey ??
      (typeof process !== "undefined" ? process.env.VON_API_KEY : undefined);

    const client = treaty<App>(baseUrl, {
      headers: apiKey ? { authorization: `Bearer ${apiKey}` } : {},
    });

    this.endpoints = client.endpoints;
    this.webhooks = client.webhooks;
    this.inbound = client.inbound;
    this.versions = client.versions;
    this.autoIdempotency = config?.autoIdempotency ?? true;
  }

  // A generated key routes the event through the durable exactly-once path, pass autoIdempotency false to opt into the faster buffered path.
  send(eventType: string, payload: unknown, options?: SendOptions) {
    const idempotencyKey =
      options?.idempotencyKey ??
      (this.autoIdempotency ? crypto.randomUUID() : undefined);
    return this.webhooks.post({
      eventType,
      payload,
      ...(idempotencyKey ? { idempotencyKey } : {}),
      ...(options?.endpointIds ? { endpointIds: options.endpointIds } : {}),
    });
  }

  sendBatch(events: BatchEvent[]) {
    return this.webhooks.batch.post({
      events: events.map((e) => {
        const idempotencyKey =
          e.idempotencyKey ??
          (this.autoIdempotency ? crypto.randomUUID() : undefined);
        return {
          eventType: e.eventType,
          payload: e.payload,
          ...(idempotencyKey ? { idempotencyKey } : {}),
          ...(e.endpointIds ? { endpointIds: e.endpointIds } : {}),
        };
      }),
    });
  }
}
