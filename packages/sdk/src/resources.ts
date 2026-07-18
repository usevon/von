import type { HttpClient, VonResult } from "@/http";
import type {
  BatchResult,
  CreateEndpointBody,
  CreateInboundEndpointBody,
  CreateVersionBody,
  DeliveryAttemptList,
  DeliveryAttemptQuery,
  DeliveryList,
  DeliveryQuery,
  Endpoint,
  EndpointList,
  EndpointWithSecret,
  InboundEndpoint,
  InboundEndpointList,
  PaginationQuery,
  ReplayBulkBody,
  ReplayBulkResult,
  ReplayEventBody,
  ReplayResult,
  RotateSecretResponse,
  SendBatchBody,
  SendEventBody,
  SuccessResponse,
  TestEndpointBody,
  TestEndpointResponse,
  UpdateEndpointBody,
  UpdateInboundEndpointBody,
  UpdateVersionBody,
  WebhookEvent,
  WebhookEventList,
  WebhookEventQuery,
  WebhookVersion,
  WebhookVersionList,
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

  listDeliveries(
    eventId: string,
    query?: DeliveryQuery
  ): Promise<VonResult<DeliveryList>> {
    return this.http.request({
      method: "GET",
      path: `/webhooks/events/${encodeURIComponent(eventId)}/deliveries`,
      query,
    });
  }

  listAttempts(
    deliveryId: string,
    query?: DeliveryAttemptQuery
  ): Promise<VonResult<DeliveryAttemptList>> {
    return this.http.request({
      method: "GET",
      path: `/webhooks/deliveries/${encodeURIComponent(deliveryId)}/attempts`,
      query,
    });
  }

  replay(
    eventId: string,
    body?: ReplayEventBody
  ): Promise<VonResult<ReplayResult>> {
    return this.http.request({
      method: "POST",
      path: `/webhooks/events/${encodeURIComponent(eventId)}/replay`,
      body: body ?? {},
    });
  }

  replayBulk(body: ReplayBulkBody): Promise<VonResult<ReplayBulkResult>> {
    return this.http.request({
      method: "POST",
      path: "/webhooks/events/replay",
      body,
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

export class InboundResource {
  private readonly http: HttpClient;

  constructor(http: HttpClient) {
    this.http = http;
  }

  create(body: CreateInboundEndpointBody): Promise<VonResult<InboundEndpoint>> {
    return this.http.request({ method: "POST", path: "/inbound", body });
  }

  list(query?: PaginationQuery): Promise<VonResult<InboundEndpointList>> {
    return this.http.request({ method: "GET", path: "/inbound", query });
  }

  get(id: string): Promise<VonResult<InboundEndpoint>> {
    return this.http.request({ method: "GET", path: this.path(id) });
  }

  update(
    id: string,
    body: UpdateInboundEndpointBody
  ): Promise<VonResult<InboundEndpoint>> {
    return this.http.request({ method: "PATCH", path: this.path(id), body });
  }

  delete(id: string): Promise<VonResult<SuccessResponse>> {
    return this.http.request({ method: "DELETE", path: this.path(id) });
  }

  private path(id: string): string {
    return `/inbound/${encodeURIComponent(id)}`;
  }
}

export class VersionsResource {
  private readonly http: HttpClient;

  constructor(http: HttpClient) {
    this.http = http;
  }

  create(body: CreateVersionBody): Promise<VonResult<WebhookVersion>> {
    return this.http.request({ method: "POST", path: "/versions", body });
  }

  list(query?: PaginationQuery): Promise<VonResult<WebhookVersionList>> {
    return this.http.request({ method: "GET", path: "/versions", query });
  }

  get(version: string): Promise<VonResult<WebhookVersion>> {
    return this.http.request({ method: "GET", path: this.path(version) });
  }

  update(
    version: string,
    body: UpdateVersionBody
  ): Promise<VonResult<WebhookVersion>> {
    return this.http.request({
      method: "PATCH",
      path: this.path(version),
      body,
    });
  }

  delete(version: string): Promise<VonResult<SuccessResponse>> {
    return this.http.request({ method: "DELETE", path: this.path(version) });
  }

  private path(version: string): string {
    return `/versions/${encodeURIComponent(version)}`;
  }
}
