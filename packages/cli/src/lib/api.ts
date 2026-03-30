import { loadConfig } from "@/lib/config";
import type {
  DeviceCodeResponse,
  DeviceTokenResponse,
  Organization,
  TunnelRegistration,
  UserSession,
} from "@/lib/types";

export type { Organization, TunnelRegistration } from "@/lib/types";

const authRequest = async <T>(
  path: string,
  options: { method?: "GET" | "POST"; body?: unknown; token?: string } = {}
): Promise<T> => {
  const config = loadConfig();
  const headers: Record<string, string> = {};

  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }
  if (options.body) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${config.apiUrl}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    const error = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(error.message || `Request failed: ${res.status}`);
  }

  return res.json() as Promise<T>;
};

export const requestDeviceCode = (
  clientId = "von-cli"
): Promise<DeviceCodeResponse> =>
  authRequest("/api/auth/device/code", {
    method: "POST",
    body: { client_id: clientId },
  });

export const pollDeviceToken = async (
  deviceCode: string,
  clientId = "von-cli"
): Promise<DeviceTokenResponse> => {
  const config = loadConfig();
  const res = await fetch(`${config.apiUrl}/api/auth/device/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "urn:ietf:params:oauth:grant-type:device_code",
      device_code: deviceCode,
      client_id: clientId,
    }),
  });
  return res.json() as Promise<DeviceTokenResponse>;
};

export const getSession = (token: string): Promise<UserSession | null> =>
  authRequest<UserSession>("/api/auth/get-session", { token }).catch(
    () => null
  );

export const listOrganizations = (token: string): Promise<Organization[]> =>
  authRequest<Organization[]>("/api/auth/organization/list", { token }).catch(
    () => []
  );

export const setActiveOrganization = async (
  token: string,
  organizationId: string
): Promise<boolean> => {
  try {
    await authRequest("/api/auth/organization/set-active", {
      method: "POST",
      token,
      body: { organizationId },
    });
    return true;
  } catch {
    return false;
  }
};

export const registerTunnel = async (
  token: string,
  port: number
): Promise<TunnelRegistration> => {
  const config = loadConfig();
  const res = await fetch(`${config.apiUrl}/register`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ port }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    const error = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(error.message || "Failed to register tunnel");
  }

  const data = (await res.json()) as { tunnelId: string; secret: string };

  const tunnelUrl = `${config.apiUrl}/t/${data.tunnelId}`;
  const wsUrl =
    config.apiUrl.replace("http://", "ws://").replace("https://", "wss://") +
    `/ws/${data.tunnelId}`;

  return { tunnelId: data.tunnelId, secret: data.secret, tunnelUrl, wsUrl };
};

export const rotateTunnel = async (
  token: string,
  tunnelId: string
): Promise<{ secret: string }> => {
  const config = loadConfig();
  const res = await fetch(`${config.apiUrl}/rotate/${tunnelId}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    const error = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(error.message || "Failed to rotate tunnel secret");
  }

  const data = (await res.json()) as { secret: string };
  return { secret: data.secret };
};
