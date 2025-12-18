import { loadConfig } from "@/lib/config";
import type {
  DeviceCodeResponse,
  DeviceTokenResponse,
  UserSession,
} from "@/lib/types";

export type { Organization, TunnelRegistration } from "@/lib/types";

type RequestOptions = {
  method?: "GET" | "POST";
  body?: unknown;
  token?: string;
  timeout?: number;
};

const request = async <T>(
  service: "api" | "tunnel",
  path: string,
  options: RequestOptions = {}
): Promise<T> => {
  const config = loadConfig();
  const baseUrl = service === "api" ? config.apiUrl : config.tunnelUrl;
  const method = options.method ?? "GET";
  const timeout = options.timeout ?? 30_000;

  const headers: Record<string, string> = {};
  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }
  if (options.body) {
    headers["Content-Type"] = "application/json";
  }

  let res: Response;
  try {
    res = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: AbortSignal.timeout(timeout),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    if (msg.includes("ECONNREFUSED") || msg.includes("fetch failed")) {
      throw new Error(`Could not connect to ${baseUrl}`);
    }
    throw new Error(`Request failed: ${msg}`);
  }

  if (!res.ok) {
    if (res.status === 404) {
      throw new Error(`API not found at ${baseUrl}`);
    }
    if (res.status >= 500) {
      throw new Error(`Server error (${res.status})`);
    }
    const error = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(error.message || `Request failed: ${res.status}`);
  }

  return res.json() as Promise<T>;
};

export const requestDeviceCode = (
  clientId = "von-cli"
): Promise<DeviceCodeResponse> =>
  request("api", "/api/auth/device/code", {
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

/** Returns null on error - used in flows where session may be expired */
export const getSession = (token: string): Promise<UserSession | null> =>
  request<UserSession>("api", "/api/auth/get-session", { token }).catch(
    () => null
  );

/** Returns empty array on error - used in flows where orgs may not exist */
export const listOrganizations = (token: string): Promise<Organization[]> =>
  request<Organization[]>("api", "/api/auth/organization/list", {
    token,
  }).catch(() => []);

export const setActiveOrganization = async (
  token: string,
  organizationId: string
): Promise<boolean> => {
  try {
    await request("api", "/api/auth/organization/set-active", {
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
  port: number,
  organizationId?: string
): Promise<TunnelRegistration> => {
  const config = loadConfig();
  const result = await request<{ tunnelId: string; secret: string }>(
    "tunnel",
    "/register",
    {
      method: "POST",
      token,
      body: { port, organizationId },
    }
  );

  const tunnelUrl = `${config.tunnelUrl}/${result.tunnelId}-${result.secret}`;
  const wsUrl =
    config.tunnelUrl.replace("http://", "ws://").replace("https://", "wss://") +
    `/ws/${result.tunnelId}`;

  return { tunnelId: result.tunnelId, secret: result.secret, tunnelUrl, wsUrl };
};

export const rotateTunnel = async (
  token: string,
  tunnelId: string
): Promise<{ secret: string }> =>
  request<{ secret: string }>("tunnel", `/rotate/${tunnelId}`, {
    method: "POST",
    token,
  });
