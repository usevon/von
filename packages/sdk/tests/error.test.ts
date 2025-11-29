import { describe, expect, test } from 'bun:test'
import { VonError } from '../src/error'

describe('VonError', () => {
  describe('constructor', () => {
    test('creates error with message', () => {
      const error = new VonError('Something went wrong')
      expect(error.message).toBe('Something went wrong')
      expect(error.name).toBe('VonError')
    })

    test('creates error with code', () => {
      const error = new VonError('Something went wrong', 'INVALID_REQUEST')
      expect(error.code).toBe('INVALID_REQUEST')
    })

    test('creates error with status code', () => {
      const error = new VonError('Not found', 'NOT_FOUND', 404)
      expect(error.statusCode).toBe(404)
    })

    test('uses default code when not provided', () => {
      const error = new VonError('Something went wrong')
      expect(error.code).toBe('UNKNOWN_ERROR')
    })

    test('uses default status code when not provided', () => {
      const error = new VonError('Something went wrong')
      expect(error.statusCode).toBe(500)
    })

    test('is instance of Error', () => {
      const error = new VonError('Something went wrong')
      expect(error).toBeInstanceOf(Error)
      expect(error).toBeInstanceOf(VonError)
    })
  })

  describe('fromResponse', () => {
    test('creates error from response data', () => {
      const error = VonError.fromResponse(
        { error: 'Resource not found', code: 'NOT_FOUND' },
        404
      )
      expect(error.message).toBe('Resource not found')
      expect(error.code).toBe('NOT_FOUND')
      expect(error.statusCode).toBe(404)
    })

    test('uses default message when not provided', () => {
      const error = VonError.fromResponse({}, 500)
      expect(error.message).toBe('Unknown error')
    })

    test('handles missing code in response', () => {
      const error = VonError.fromResponse({ error: 'Bad request' }, 400)
      expect(error.message).toBe('Bad request')
      expect(error.code).toBe('UNKNOWN_ERROR')
    })

    test('creates error from partial response', () => {
      const error = VonError.fromResponse({ code: 'RATE_LIMITED' }, 429)
      expect(error.message).toBe('Unknown error')
      expect(error.code).toBe('RATE_LIMITED')
      expect(error.statusCode).toBe(429)
    })
  })

  describe('error codes', () => {
    test('handles common HTTP error codes', () => {
      const badRequest = new VonError('Bad request', 'BAD_REQUEST', 400)
      const unauthorized = new VonError('Unauthorized', 'UNAUTHORIZED', 401)
      const forbidden = new VonError('Forbidden', 'FORBIDDEN', 403)
      const notFound = new VonError('Not found', 'NOT_FOUND', 404)
      const serverError = new VonError('Internal error', 'INTERNAL_ERROR', 500)

      expect(badRequest.statusCode).toBe(400)
      expect(unauthorized.statusCode).toBe(401)
      expect(forbidden.statusCode).toBe(403)
      expect(notFound.statusCode).toBe(404)
      expect(serverError.statusCode).toBe(500)
    })
  })
})
