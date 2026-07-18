import type { HttpClient, VonResult } from "@/http";
import type {
  BatchResult,
  CreateEndpointBody,
  Endpoint,
  EndpointList,
  EndpointWithSecret,
  PaginationQuery,
  RotateSecretResponse,
  SendBatchBody,
  SendEventBody,
  SuccessResponse,
  TestEndpointBody,
  TestEndpointResponse,
  UpdateEndpointBody,
  WebhookEvent,
  WebhookEventList,
  WebhookEventQuery,
} from "@/types";

export class WebhooksResource {
  private readonly http: HttpClient;

  constructor(http: HttpClient) {
    this.http = http;
  }

  send(body: SendEventBody): Promise<VonResult<WebhookEvent>> {
    return this.http.request({ method: "POST", path: "/webhooks", body });
  }

  sendBatch(body: SendBatchBody): Promise<VonResult<BatchResult>> {
    return this.http.request({ method: "POST", path: "/webhooks/batch", body });
  }

  list(query?: WebhookEventQuery): Promise<VonResult<WebhookEventList>> {
    return this.http.request({
      method: "GET",
      path: "/webhooks/events",
      query,
    });
  }

  get(id: string): Promise<VonResult<WebhookEvent>> {
    return this.http.request({
      method: "GET",
      path: `/webhooks/events/${encodeURIComponent(id)}`,
    });
  }
}

export class EndpointsResource {
  private readonly http: HttpClient;

  constructor(http: HttpClient) {
    this.http = http;
  }

  create(body: CreateEndpointBody): Promise<VonResult<EndpointWithSecret>> {
    return this.http.request({ method: "POST", path: "/endpoints", body });
  }

  list(query?: PaginationQuery): Promise<VonResult<EndpointList>> {
    return this.http.request({ method: "GET", path: "/endpoints", query });
  }

  get(id: string): Promise<VonResult<Endpoint>> {
    return this.http.request({ method: "GET", path: this.path(id) });
  }

  update(id: string, body: UpdateEndpointBody): Promise<VonResult<Endpoint>> {
    return this.http.request({ method: "PATCH", path: this.path(id), body });
  }

  delete(id: string): Promise<VonResult<SuccessResponse>> {
    return this.http.request({ method: "DELETE", path: this.path(id) });
  }

  rotateSecret(id: string): Promise<VonResult<RotateSecretResponse>> {
    return this.http.request({
      method: "POST",
      path: `${this.path(id)}/rotate`,
    });
  }

  clearPreviousSecret(id: string): Promise<VonResult<SuccessResponse>> {
    return this.http.request({
      method: "DELETE",
      path: `${this.path(id)}/previous-secret`,
    });
  }

  test(
    id: string,
    body?: TestEndpointBody
  ): Promise<VonResult<TestEndpointResponse>> {
    return this.http.request({
      method: "POST",
      path: `${this.path(id)}/test`,
      body: body ?? {},
    });
  }

  private path(id: string): string {
    return `/endpoints/${encodeURIComponent(id)}`;
  }
}
