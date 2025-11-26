export const BASE_URL = "http://localhost"

export function createRequest(path: string, options?: RequestInit) {
  return new Request(`${BASE_URL}${path}`, options)
}

export function createAuthRequest(path: string, apiKey: string, options?: RequestInit) {
  return new Request(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      ...options?.headers,
    },
  })
}

export function jsonRequest(path: string, body: unknown, options?: RequestInit) {
  return new Request(`${BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    body: JSON.stringify(body),
    ...options,
  })
}

export function jsonAuthRequest(path: string, body: unknown, apiKey: string, options?: RequestInit) {
  return new Request(`${BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      ...options?.headers,
    },
    body: JSON.stringify(body),
    ...options,
  })
}
