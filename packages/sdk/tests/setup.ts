import { mock } from 'bun:test'

export type MockResponse = {
  ok: boolean
  status: number
  statusText: string
  headers: Headers
  json: () => Promise<unknown>
}

export const mockFetch = (response: MockResponse) => {
  return mock(() => Promise.resolve(response))
}

export const mockJsonResponse = <T>(data: T, status = 200): MockResponse => ({
  ok: status >= 200 && status < 300,
  status,
  statusText: status === 200 ? 'OK' : 'Error',
  headers: new Headers({ 'Content-Type': 'application/json' }),
  json: () => Promise.resolve(data),
})

export const mockErrorResponse = (
  error: string,
  code: string,
  status: number
): MockResponse => ({
  ok: false,
  status,
  statusText: 'Error',
  headers: new Headers({ 'Content-Type': 'application/json' }),
  json: () => Promise.resolve({ error, code }),
})
