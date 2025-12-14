import { describe, expect, test, beforeEach, afterEach, spyOn } from 'bun:test'
import { Von } from '../src/client'
import { mockJsonResponse } from './setup'

describe('Webhooks Methods', () => {
  let originalFetch: typeof globalThis.fetch
  let von: Von

  beforeEach(() => {
    originalFetch = globalThis.fetch
    von = new Von({ baseUrl: 'https://api.test.com', apiKey: 'test-key' })
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  describe('send', () => {
    test('sends POST to /webhooks', async () => {
      const webhookEvent = {
        id: 'evt_123',
        eventType: 'user.created',
        payload: { userId: '123' },
        idempotencyKey: null,
        status: 'pending',
        createdAt: '2024-01-01T00:00:00Z',
      }
      const mockResponse = mockJsonResponse(webhookEvent)
      const fetchSpy = spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse as Response)

      const result = await von.webhooks.send({
        eventType: 'user.created',
        payload: { userId: '123' },
      })

      expect(fetchSpy).toHaveBeenCalledWith('https://api.test.com/webhooks', expect.objectContaining({
        method: 'POST',
      }))
      expect(result.error).toBeNull()
      expect(result.data?.id).toBe('evt_123')
      expect(result.data?.eventType).toBe('user.created')
    })

    test('includes idempotencyKey and endpointIds when provided', async () => {
      const mockResponse = mockJsonResponse({ id: 'evt_123' })
      const fetchSpy = spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse as Response)

      await von.webhooks.send({
        eventType: 'user.created',
        payload: { userId: '123' },
        idempotencyKey: 'key-123',
        endpointIds: ['ep_1', 'ep_2'],
      })

      const callArgs = fetchSpy.mock.calls[0]
      const body = JSON.parse(callArgs[1]?.body as string)
      expect(body.idempotencyKey).toBe('key-123')
      expect(body.endpointIds).toEqual(['ep_1', 'ep_2'])
    })
  })

  describe('sendBatch', () => {
    test('sends POST to /webhooks/batch', async () => {
      const batchResponse = {
        created: 2,
        events: [
          { id: 'evt_1', eventType: 'user.created', payload: {}, idempotencyKey: null, status: 'pending', createdAt: '2024-01-01T00:00:00Z' },
          { id: 'evt_2', eventType: 'user.updated', payload: {}, idempotencyKey: null, status: 'pending', createdAt: '2024-01-01T00:00:00Z' },
        ],
      }
      const mockResponse = mockJsonResponse(batchResponse)
      const fetchSpy = spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse as Response)

      const result = await von.webhooks.sendBatch({
        events: [
          { eventType: 'user.created', payload: { userId: '1' } },
          { eventType: 'user.updated', payload: { userId: '2' } },
        ],
      })

      expect(fetchSpy).toHaveBeenCalledWith('https://api.test.com/webhooks/batch', expect.objectContaining({
        method: 'POST',
      }))
      expect(result.error).toBeNull()
      expect(result.data?.created).toBe(2)
      expect(result.data?.events).toHaveLength(2)
    })
  })

  describe('list', () => {
    test('sends GET to /webhooks/events', async () => {
      const eventsResponse = {
        events: [
          { id: 'evt_1', eventType: 'user.created', payload: {}, idempotencyKey: null, status: 'delivered', createdAt: '2024-01-01T00:00:00Z' },
        ],
        total: 1,
      }
      const mockResponse = mockJsonResponse(eventsResponse)
      const fetchSpy = spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse as Response)

      const result = await von.webhooks.list()

      expect(fetchSpy).toHaveBeenCalledWith('https://api.test.com/webhooks/events', expect.objectContaining({
        method: 'GET',
      }))
      expect(result.error).toBeNull()
      expect(result.data?.events).toHaveLength(1)
      expect(result.data?.total).toBe(1)
    })

    test('includes pagination params in query string', async () => {
      const mockResponse = mockJsonResponse({ events: [], total: 0 })
      const fetchSpy = spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse as Response)

      await von.webhooks.list({ limit: 10, offset: 20 })

      expect(fetchSpy).toHaveBeenCalledWith('https://api.test.com/webhooks/events?limit=10&offset=20', expect.anything())
    })
  })

  describe('get', () => {
    test('sends GET to /webhooks/events/:id', async () => {
      const webhookEvent = {
        id: 'evt_123',
        eventType: 'user.created',
        payload: { userId: '123' },
        idempotencyKey: null,
        status: 'delivered',
        createdAt: '2024-01-01T00:00:00Z',
      }
      const mockResponse = mockJsonResponse(webhookEvent)
      const fetchSpy = spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse as Response)

      const result = await von.webhooks.get('evt_123')

      expect(fetchSpy).toHaveBeenCalledWith('https://api.test.com/webhooks/events/evt_123', expect.objectContaining({
        method: 'GET',
      }))
      expect(result.error).toBeNull()
      expect(result.data?.id).toBe('evt_123')
    })
  })
})
