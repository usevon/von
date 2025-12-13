import { loadConfig } from "@/lib/config"
import type {
  DeviceCodeResponse,
  DeviceTokenResponse,
  UserSession,
  Organization,
  TunnelRegistration,
} from "@/lib/types"

export type { Organization, TunnelRegistration }

type RequestOptions = {
  method?: "GET" | "POST"
  body?: unknown
  token?: string
  timeout?: number
}

const request = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
  const config = loadConfig()
  const { method = "GET", body, token, timeout = 30000 } = options

  const headers: Record<string, string> = {}
  if (token) headers["Authorization"] = `Bearer ${token}`
  if (body) headers["Content-Type"] = "application/json"

  let res: Response
  try {
    res = await fetch(`${config.apiUrl}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(timeout),
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    if (msg.includes("ECONNREFUSED") || msg.includes("fetch failed")) {
      throw new Error(`Could not connect to ${config.apiUrl}`)
    }
    throw new Error(`Request failed: ${msg}`)
  }

  if (!res.ok) {
    if (res.status === 404) {
      throw new Error(`API not found at ${config.apiUrl}`)
    }
    if (res.status >= 500) {
      throw new Error(`Server error (${res.status})`)
    }
    throw new Error(`Request failed: ${res.status}`)
  }

  return res.json() as Promise<T>
}

const tunnelRequest = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
  const config = loadConfig()
  const { method = "GET", body, token, timeout = 30000 } = options

  const headers: Record<string, string> = {}
  if (token) headers["Authorization"] = `Bearer ${token}`
  if (body) headers["Content-Type"] = "application/json"

  const res = await fetch(`${config.tunnelUrl}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(timeout),
  })

  if (!res.ok) {
    const error = (await res.json().catch(() => ({}))) as { message?: string }
    throw new Error(error.message || "Request failed")
  }

  return res.json() as Promise<T>
}

export const requestDeviceCode = (clientId = "von-cli"): Promise<DeviceCodeResponse> => {
  return request("/api/auth/device/code", {
    method: "POST",
    body: { client_id: clientId },
  })
}

export const pollDeviceToken = async (
  deviceCode: string,
  clientId = "von-cli"
): Promise<DeviceTokenResponse> => {
  const config = loadConfig()
  const res = await fetch(`${config.apiUrl}/api/auth/device/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "urn:ietf:params:oauth:grant-type:device_code",
      device_code: deviceCode,
      client_id: clientId,
    }),
  })
  return res.json() as Promise<DeviceTokenResponse>
}

export const getSession = (token: string): Promise<UserSession | null> => {
  return request<UserSession>("/api/auth/get-session", { token }).catch(() => null)
}

export const listOrganizations = (token: string): Promise<Organization[]> => {
  return request<Organization[]>("/api/auth/organization/list", { token }).catch(() => [])
}

export const setActiveOrganization = async (
  token: string,
  organizationId: string
): Promise<boolean> => {
  try {
    await request("/api/auth/organization/set-active", {
      method: "POST",
      token,
      body: { organizationId },
    })
    return true
  } catch {
    return false
  }
}

export const registerTunnel = async (
  token: string,
  port: number,
  organizationId?: string
): Promise<TunnelRegistration> => {
  const config = loadConfig()
  const { tunnelId } = await tunnelRequest<{ tunnelId: string }>("/register", {
    method: "POST",
    token,
    body: { port, organizationId },
  })

  const tunnelUrl = `${config.tunnelUrl}/${tunnelId}`
  const wsUrl = config.tunnelUrl
    .replace("http://", "ws://")
    .replace("https://", "wss://") + `/ws/${tunnelId}`

  return { tunnelId, tunnelUrl, wsUrl }
}
