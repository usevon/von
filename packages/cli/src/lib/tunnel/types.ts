export type TunnelRequest = {
  id: string;
  method: string;
  path: string;
  headers: Record<string, string>;
  body?: string;
};

export type TunnelResponse = {
  requestId: string;
  status: number;
  headers: Record<string, string>;
  body: string;
};

export type TunnelManagerOptions = {
  verbose?: boolean;
  onTakeover?: (port: number) => void;
  onSessionExpired?: (port: number) => void;
  onMaxRetries?: (port: number) => void;
  onSecretRotated?: (port: number, newSecret: string) => void;
};
