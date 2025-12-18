import {
  type FetchHooks,
  type RetryOptions,
  type VonFetchResponse,
  vonFetch,
} from "@usevon/utils";
import { endpointsMethods } from "@/endpoints";
import { inboundMethods } from "@/inbound";
import type { VonConfig } from "@/types";
import { versionsMethods } from "@/versions";
import { webhooksMethods } from "@/webhooks";

const DEFAULT_BASE_URL = "http://localhost:3000";

export class Von {
  private readonly baseUrl: string;
  private readonly apiKey?: string;
  private readonly retry?: RetryOptions;
  private readonly hooks?: Omit<FetchHooks, "onSuccess" | "onError">;
  private readonly timeout?: number;

  readonly webhooks: ReturnType<typeof webhooksMethods>;
  readonly endpoints: ReturnType<typeof endpointsMethods>;
  readonly inbound: ReturnType<typeof inboundMethods>;
  readonly versions: ReturnType<typeof versionsMethods>;

  constructor(config?: VonConfig) {
    this.baseUrl =
      config?.baseUrl ?? process.env.VON_BASE_URL ?? DEFAULT_BASE_URL;
    this.apiKey = config?.apiKey ?? process.env.VON_API_KEY;
    this.retry = config?.retry;
    this.hooks = config?.hooks;
    this.timeout = config?.timeout;

    this.webhooks = webhooksMethods(this);
    this.endpoints = endpointsMethods(this);
    this.inbound = inboundMethods(this);
    this.versions = versionsMethods(this);
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};
    if (this.apiKey) {
      headers.Authorization = `Bearer ${this.apiKey}`;
    }
    return headers;
  }

  request<T>(
    method: "GET" | "POST" | "PATCH" | "DELETE",
    path: string,
    body?: unknown
  ): Promise<VonFetchResponse<T>> {
    return vonFetch<T>(`${this.baseUrl}${path}`, {
      method,
      headers: this.getHeaders(),
      body,
      retry: this.retry,
      timeout: this.timeout,
      ...this.hooks,
    });
  }

  get<T>(path: string): Promise<VonFetchResponse<T>> {
    return this.request<T>("GET", path);
  }

  post<T>(path: string, body?: unknown): Promise<VonFetchResponse<T>> {
    return this.request<T>("POST", path, body);
  }

  patch<T>(path: string, body?: unknown): Promise<VonFetchResponse<T>> {
    return this.request<T>("PATCH", path, body);
  }

  delete<T>(path: string): Promise<VonFetchResponse<T>> {
    return this.request<T>("DELETE", path);
  }
}
