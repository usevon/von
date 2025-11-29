import { describe, expect, test, beforeEach, afterEach, spyOn } from 'bun:test'
import { Von } from '../src/client'
import { VonError } from '../src/error'
import { mockJsonResponse, mockErrorResponse } from './setup'

describe('Von Client', () => {
  let originalFetch: typeof globalThis.fetch

  beforeEach(() => {
    originalFetch = globalThis.fetch
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  describe('constructor', () => {
    test('uses default base URL when not provided', () => {
      const von = new Von()
      expect(von).toBeDefined()
    })

    test('uses provided base URL', () => {
      const von = new Von({ baseUrl: 'https://api.example.com' })
      expect(von).toBeDefined()
    })

    test('uses provided API key', () => {
      const von = new Von({ apiKey: 'test-key' })
      expect(von).toBeDefined()
    })

    test('initializes namespace methods', () => {
      const von = new Von()
      expect(von.webhooks).toBeDefined()
      expect(von.endpoints).toBeDefined()
      expect(von.inbound).toBeDefined()
    })
  })

  describe('request', () => {
    test('sends GET request with correct headers', async () => {
      const mockResponse = mockJsonResponse({ id: '123' })
      const fetchSpy = spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse as Response)

      const von = new Von({ baseUrl: 'https://api.test.com', apiKey: 'test-key' })
      await von.get('/test')

      expect(fetchSpy).toHaveBeenCalledWith('https://api.test.com/test', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-key',
        },
        body: undefined,
      })
    })

    test('sends POST request with body', async () => {
      const mockResponse = mockJsonResponse({ id: '123' })
      const fetchSpy = spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse as Response)

      const von = new Von({ baseUrl: 'https://api.test.com', apiKey: 'test-key' })
      await von.post('/test', { data: 'value' })

      expect(fetchSpy).toHaveBeenCalledWith('https://api.test.com/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-key',
        },
        body: JSON.stringify({ data: 'value' }),
      })
    })

    test('sends PATCH request with body', async () => {
      const mockResponse = mockJsonResponse({ id: '123' })
      const fetchSpy = spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse as Response)

      const von = new Von({ baseUrl: 'https://api.test.com', apiKey: 'test-key' })
      await von.patch('/test', { data: 'value' })

      expect(fetchSpy).toHaveBeenCalledWith('https://api.test.com/test', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-key',
        },
        body: JSON.stringify({ data: 'value' }),
      })
    })

    test('sends DELETE request', async () => {
      const mockResponse = mockJsonResponse({})
      const fetchSpy = spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse as Response)

      const von = new Von({ baseUrl: 'https://api.test.com', apiKey: 'test-key' })
      await von.delete('/test')

      expect(fetchSpy).toHaveBeenCalledWith('https://api.test.com/test', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-key',
        },
        body: undefined,
      })
    })

    test('does not include Authorization header when no API key', async () => {
      const mockResponse = mockJsonResponse({ id: '123' })
      const fetchSpy = spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse as Response)

      const von = new Von({ baseUrl: 'https://api.test.com' })
      await von.get('/test')

      expect(fetchSpy).toHaveBeenCalledWith('https://api.test.com/test', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        body: undefined,
      })
    })

    test('returns data on success', async () => {
      const expectedData = { id: '123', name: 'test' }
      const mockResponse = mockJsonResponse(expectedData)
      spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse as Response)

      const von = new Von({ baseUrl: 'https://api.test.com' })
      const result = await von.get<typeof expectedData>('/test')

      expect(result).toEqual(expectedData)
    })

    test('throws VonError on error response', async () => {
      const mockResponse = mockErrorResponse('Not found', 'NOT_FOUND', 404)
      spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse as Response)

      const von = new Von({ baseUrl: 'https://api.test.com' })

      expect(von.get('/test')).rejects.toThrow(VonError)
    })

    test('VonError contains correct properties', async () => {
      const mockResponse = mockErrorResponse('Not found', 'NOT_FOUND', 404)
      spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse as Response)

      const von = new Von({ baseUrl: 'https://api.test.com' })

      try {
        await von.get('/test')
        expect(true).toBe(false) // Should not reach here
      } catch (e) {
        expect(e).toBeInstanceOf(VonError)
        const error = e as VonError
        expect(error.message).toBe('Not found')
        expect(error.code).toBe('NOT_FOUND')
        expect(error.statusCode).toBe(404)
      }
    })
  })
})
