import { mock } from 'bun:test'

export type MockResponse = {
  ok: boolean
  status: number
  json: () => Promise<unknown>
}

export const mockFetch = (response: MockResponse) => {
  return mock(() => Promise.resolve(response))
}

export const mockJsonResponse = <T>(data: T, status = 200): MockResponse => ({
  ok: status >= 200 && status < 300,
  status,
  json: () => Promise.resolve(data),
})

export const mockErrorResponse = (
  error: string,
  code: string,
  status: number
): MockResponse => ({
  ok: false,
  status,
  json: () => Promise.resolve({ error, code }),
})
