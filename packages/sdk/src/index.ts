import { treaty } from "@elysiajs/eden";
import type { App } from "@usevon/api";

export { verifyWebhook, WebhookVerificationError } from "@/verify";

export type VonConfig = {
  baseUrl?: string;
  apiKey?: string;
  autoIdempotency?: boolean;
  retries?: number;
  retryDelayMs?: number;
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

const RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504]);

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type ApiResult = { error: unknown; status: number };

/**
 * Von SDK client using Eden Treaty for type-safe API calls.
 *
 * @example
 * ```ts
 * import { Von } from "@usevon/sdk";
 *
 * const von = new Von({ apiKey: "von_xxx" });
 *
 * // Send an event, durable, exactly-once, and retried on transient failures
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
  private readonly retries: number;
  private readonly retryDelayMs: number;

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
    this.retries = config?.retries ?? 2;
    this.retryDelayMs = config?.retryDelayMs ?? 250;
  }

  // A generated key routes the event through the durable exactly-once path, pass autoIdempotency false to opt into the faster buffered path.
  send(eventType: string, payload: unknown, options?: SendOptions) {
    const idempotencyKey =
      options?.idempotencyKey ??
      (this.autoIdempotency ? crypto.randomUUID() : undefined);
    return this.withRetries(
      () =>
        this.webhooks.post({
          eventType,
          payload,
          ...(idempotencyKey ? { idempotencyKey } : {}),
          ...(options?.endpointIds ? { endpointIds: options.endpointIds } : {}),
        }),
      idempotencyKey !== undefined
    );
  }

  sendBatch(events: BatchEvent[]) {
    const prepared = events.map((e) => {
      const idempotencyKey =
        e.idempotencyKey ??
        (this.autoIdempotency ? crypto.randomUUID() : undefined);
      return {
        eventType: e.eventType,
        payload: e.payload,
        ...(idempotencyKey ? { idempotencyKey } : {}),
        ...(e.endpointIds ? { endpointIds: e.endpointIds } : {}),
      };
    });
    const everyEventHasKey = prepared.every((e) => "idempotencyKey" in e);
    return this.withRetries(
      () => this.webhooks.batch.post({ events: prepared }),
      everyEventHasKey
    );
  }

  // Retries only run when every event carries an idempotency key, so a retry can never create a duplicate.
  private async withRetries<T extends ApiResult>(
    attempt: () => Promise<T>,
    safeToRetry: boolean
  ): Promise<T> {
    const maxAttempts = safeToRetry ? this.retries + 1 : 1;
    for (let i = 0; ; i++) {
      try {
        const result = await attempt();
        if (
          !result.error ||
          i >= maxAttempts - 1 ||
          !RETRYABLE_STATUSES.has(result.status)
        ) {
          return result;
        }
      } catch (error) {
        if (i >= maxAttempts - 1) {
          throw error;
        }
      }
      await delay(this.retryDelayMs * 2 ** i);
    }
  }
}
