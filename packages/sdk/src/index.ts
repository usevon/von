import { treaty } from "@elysiajs/eden";

export type { App } from "@usevon/api";

type App = import("@usevon/api").App;

export { verifyWebhook, WebhookVerificationError } from "@/verify";

export type VonConfig = {
  baseUrl?: string;
  apiKey?: string;
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
 * // Create endpoint
 * const { data, error } = await von.endpoints.post({
 *   url: "https://example.com/webhook",
 * });
 *
 * // Get endpoint
 * const { data } = await von.endpoints["ep_xxx"].get();
 *
 * // Send webhook
 * await von.webhooks.post({ eventType: "order.created", payload: {...} });
 * ```
 */
export class Von {
  readonly endpoints;
  readonly webhooks;
  readonly inbound;
  readonly versions;

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
  }
}
