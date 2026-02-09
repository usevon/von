import type { EndpointStatus } from "./endpoints";
import type { DeliveryResponse } from "./webhooks";

export type InboundEndpoint = {
  id: string;
  name: string | null;
  provider: string | null;
  secret: string;
  forwardUrl: string;
  status: EndpointStatus;
  lastSuccessAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateInboundEndpoint = {
  name?: string;
  provider?: string;
  forwardUrl: string;
  status?: EndpointStatus;
};

export type UpdateInboundEndpoint = {
  name?: string;
  provider?: string;
  forwardUrl?: string;
  status?: EndpointStatus;
};

export type InboundDelivery = {
  id: string;
  payload: unknown;
  headers: Record<string, string> | null;
  status: string;
  forwardedAt: string | null;
  response: DeliveryResponse;
  createdAt: string;
};
