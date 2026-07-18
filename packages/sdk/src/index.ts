import { HttpClient } from "@/http";
import { EndpointsResource, WebhooksResource } from "@/resources";

export type { RequestOptions, VonApiError, VonResult } from "@/http";
export { EndpointsResource, WebhooksResource } from "@/resources";
export type * from "@/types";
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

/**
 * Why a 429 happened. Rate limits clear within a second, quota needs a plan change,
 * so callers should back off for one and upgrade for the other.
 */
export type LimitKind = "rate" | "quota" | "unknown";

export const limitKindOf = (error: unknown): LimitKind => {
  const message =
    typeof error === "object" && error !== null
      ? String(
          (error as { value?: { error?: { message?: string } } }).value?.error
            ?.message ??
            (error as { message?: string }).message ??
            ""
        )
      : String(error ?? "");

  if (message.includes("rate limit")) {
    return "rate";
  }
  if (message.includes("quota")) {
    return "quota";
  }
  return "unknown";
};

export type BatchEvent = {
  eventType: string;
  payload: unknown;
  idempotencyKey?: string;
  endpointIds?: string[];
};

const RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504]);

/** Largest payload the API accepts for a single event. */
export const MAX_PAYLOAD_BYTES = 1024 * 1024;

/** Payloads are billed in chunks of this size, so a large event costs more than a small one. */
export const BILLABLE_CHUNK_BYTES = 64 * 1024;

/** Number of messages an event of this size is billed as, minimum one. */
export const billableMessages = (payloadBytes: number): number =>
  Math.max(1, Math.ceil(payloadBytes / BILLABLE_CHUNK_BYTES));

export class PayloadTooLargeError extends Error {
  readonly bytes: number;
  readonly limit = MAX_PAYLOAD_BYTES;

  constructor(bytes: number) {
    super(
      `Payload is ${bytes} bytes, over the ${MAX_PAYLOAD_BYTES} byte limit`
    );
    this.name = "PayloadTooLargeError";
    this.bytes = bytes;
  }
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const assertWithinLimit = (payload: unknown) => {
  const bytes = new TextEncoder().encode(JSON.stringify(payload) ?? "").length;
  if (bytes > MAX_PAYLOAD_BYTES) {
    throw new PayloadTooLargeError(bytes);
  }
};

type ApiResult = { error: unknown; status: number };

/**
 * Von SDK client.
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
 * // Create an endpoint
 * const { data, error } = await von.endpoints.create({
 *   url: "https://example.com/webhook",
 * });
 *
 * // The raw request surface stays available
 * await von.webhooks.send({ eventType: "order.created", payload: {} });
 * ```
 */
export class Von {
  readonly endpoints: EndpointsResource;
  readonly webhooks: WebhooksResource;
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

    const http = new HttpClient(baseUrl, apiKey);

    this.endpoints = new EndpointsResource(http);
    this.webhooks = new WebhooksResource(http);
    this.autoIdempotency = config?.autoIdempotency ?? true;
    this.retries = config?.retries ?? 2;
    this.retryDelayMs = config?.retryDelayMs ?? 250;
  }

  // A generated key routes the event through the durable exactly-once path, pass autoIdempotency false to opt into the faster buffered path.
  async send(eventType: string, payload: unknown, options?: SendOptions) {
    assertWithinLimit(payload);
    const idempotencyKey =
      options?.idempotencyKey ??
      (this.autoIdempotency ? crypto.randomUUID() : undefined);
    return await this.withRetries(
      () =>
        this.webhooks.send({
          eventType,
          payload,
          ...(idempotencyKey ? { idempotencyKey } : {}),
          ...(options?.endpointIds ? { endpointIds: options.endpointIds } : {}),
        }),
      idempotencyKey !== undefined
    );
  }

  async sendBatch(events: BatchEvent[]) {
    for (const e of events) {
      assertWithinLimit(e.payload);
    }
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
    return await this.withRetries(
      () => this.webhooks.sendBatch({ events: prepared }),
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
