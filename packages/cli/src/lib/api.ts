import { loadConfig } from "@/lib/config"

type DeviceCodeResponse = {
  device_code: string
  user_code: string
  verification_uri: string
  verification_uri_complete?: string
  expires_in: number
  interval: number
}

type DeviceTokenResponse = {
  access_token?: string
  token_type?: string
  expires_in?: number
  error?: string
  error_description?: string
}

type UserSession = {
  user: {
    id: string
    name: string
    email: string
    image?: string
  }
  session: {
    id: string
    activeOrganizationId?: string
  }
}

type Organization = {
  id: string
  name: string
  slug: string
}

type TunnelRegistrationResponse = {
  tunnelId: string
}

type TunnelRegistration = {
  tunnelId: string
  tunnelUrl: string
  wsUrl: string
}

export const requestDeviceCode = async (
  clientId: string = "von-cli"
): Promise<DeviceCodeResponse> => {
  const config = loadConfig()
  const url = `${config.apiUrl}/api/auth/device/code`

  let res: Response
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: clientId }),
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    if (msg.includes("ECONNREFUSED") || msg.includes("fetch failed")) {
      throw new Error(`Could not connect to ${config.apiUrl}\nIs the server running?`)
    }
    throw new Error(`Connection failed: ${msg}`)
  }

  if (!res.ok) {
    if (res.status === 404) {
      throw new Error(`API not found at ${config.apiUrl}\nCheck the URL or try 'von login --local' for local development`)
    }
    if (res.status >= 500) {
      throw new Error(`Server error (${res.status})\nThe Von API may be unavailable`)
    }
    throw new Error(`Request failed: ${res.status} ${res.statusText}`)
  }

  return res.json() as Promise<DeviceCodeResponse>
}

export const pollDeviceToken = async (
  deviceCode: string,
  clientId: string = "von-cli"
): Promise<DeviceTokenResponse> => {
  const config = loadConfig()
  const url = `${config.apiUrl}/api/auth/device/token`

  const res = await fetch(url, {
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

export const getSession = async (token: string): Promise<UserSession | null> => {
  const config = loadConfig()

  const res = await fetch(`${config.apiUrl}/api/auth/get-session`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!res.ok) return null

  return res.json() as Promise<UserSession>
}

export const listOrganizations = async (token: string): Promise<Organization[]> => {
  const config = loadConfig()

  const res = await fetch(`${config.apiUrl}/api/auth/organization/list`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!res.ok) return []

  const data = await res.json() as Organization[]
  return data || []
}

export const setActiveOrganization = async (
  token: string,
  organizationId: string
): Promise<boolean> => {
  const config = loadConfig()

  const res = await fetch(`${config.apiUrl}/api/auth/organization/set-active`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ organizationId }),
  })

  return res.ok
}

export const registerTunnel = async (
  token: string,
  port: number,
  organizationId?: string
): Promise<TunnelRegistration> => {
  const config = loadConfig()

  const res = await fetch(`${config.tunnelUrl}/register`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ port, organizationId }),
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({})) as { message?: string }
    throw new Error(error.message || "Failed to register tunnel")
  }

  const { tunnelId } = await res.json() as TunnelRegistrationResponse

  const tunnelUrl = `${config.tunnelUrl}/${tunnelId}`
  const wsUrl = config.tunnelUrl
    .replace("http://", "ws://")
    .replace("https://", "wss://") + `/ws/${tunnelId}`

  return { tunnelId, tunnelUrl, wsUrl }
}
