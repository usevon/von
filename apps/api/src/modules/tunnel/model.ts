import { t } from "elysia";

/**
 * Request forwarded from tunnel server to CLI
 */
export type TunnelRequest = {
	id: string;
	method: string;
	path: string;
	headers: Record<string, string>;
	body?: string;
};

/**
 * Response from CLI back to tunnel server
 */
export type TunnelResponse = {
	requestId: string;
	status: number;
	headers: Record<string, string>;
	body: string;
};

export type PendingRequest = {
  resolve: (res: TunnelResponse) => void;
  reject: (err: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
};

export type TunnelConnection = {
  send: (data: string) => void;
  close: () => void;
  pending: Map<string, PendingRequest>;
  headers: Record<string, string>;
  validationInterval?: ReturnType<typeof setInterval>;
  organizationId: string;
  secret: string;
};

export type TunnelRelayRequest = {
  type: "request";
  requestId: string;
  tunnelId: string;
  request: TunnelRequest;
  replyTo: string;
};

export type TunnelRelayResponse = {
  type: "response";
  requestId: string;
  response: TunnelResponse;
};

export type TunnelRelayError = {
  type: "error";
  requestId: string;
  error: string;
};

export type TunnelRelayMessage =
  | TunnelRelayRequest
  | TunnelRelayResponse
  | TunnelRelayError;

export namespace TunnelModel {
  export const registerBody = t.Object({
    port: t.Number({ minimum: 1, maximum: 65_535 }),
  });

  export type registerBody = typeof registerBody.static;

  export const registerResponse = t.Object({
    tunnelId: t.String(),
    secret: t.String(),
  });

  export type registerResponse = typeof registerResponse.static;

  export const rotateResponse = t.Object({
    secret: t.String(),
  });

  export type rotateResponse = typeof rotateResponse.static;
}
