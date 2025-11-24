export const BASE_URL = "http://localhost"

export const createRequest = (path: string, options?: RequestInit) => {
  return new Request(`${BASE_URL}${path}`, options)
}

export const jsonRequest = (path: string, body: unknown, options?: RequestInit) => {
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
