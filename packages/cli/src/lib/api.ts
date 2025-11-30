import { loadConfig } from "./config"

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

type TunnelRegistration = {
  tunnelId: string
  wsUrl: string
}

export const requestDeviceCode = async (
  clientId: string = "von-cli"
): Promise<DeviceCodeResponse> => {
  const config = loadConfig()
  const url = `${config.apiUrl}/api/auth/device/code`

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: clientId }),
  })

  if (!res.ok) {
    const text = await res.text()
    console.error(`Device code request failed: ${res.status} ${res.statusText}`)
    console.error(`URL: ${url}`)
    console.error(`Response: ${text}`)
    throw new Error("Failed to request device code")
  }

  return res.json()
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

  return res.json()
}

export const getSession = async (token: string): Promise<UserSession | null> => {
  const config = loadConfig()

  const res = await fetch(`${config.apiUrl}/api/auth/get-session`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!res.ok) return null

  return res.json()
}

export const listOrganizations = async (token: string): Promise<Organization[]> => {
  const config = loadConfig()

  const res = await fetch(`${config.apiUrl}/api/auth/organization/list`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!res.ok) return []

  const data = await res.json()
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

  const res = await fetch(`${config.apiUrl}/api/tunnel/register`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ port, organizationId }),
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({}))
    throw new Error(error.message || "Failed to register tunnel")
  }

  return res.json()
}
