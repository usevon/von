import { describe, expect, test } from 'bun:test'
import { verifyWebhook, WebhookVerificationError } from '../src/webhooks/verify'
import { hmacSign } from '@usevon/utils'

const createSignature = (payload: string, secret: string, timestamp?: number) => {
  const ts = timestamp ?? Math.floor(Date.now() / 1000)
  const signedPayload = `${ts}.${payload}`
  const sig = hmacSign(signedPayload, secret)
  return { header: `t=${ts},v1=${sig}`, timestamp: ts }
}

describe('verifyWebhook', () => {
  const secret = 'test-secret-123'
  const payload = JSON.stringify({ event: 'test', data: { id: 1 } })

  test('verifies valid signature and returns parsed payload', () => {
    const { header } = createSignature(payload, secret)
    const result = verifyWebhook<{ event: string; data: { id: number } }>(payload, header, secret)

    expect(result.event).toBe('test')
    expect(result.data.id).toBe(1)
  })

  test('throws on invalid signature', () => {
    const { header } = createSignature(payload, 'wrong-secret')

    expect(() => verifyWebhook(payload, header, secret)).toThrow(WebhookVerificationError)
    expect(() => verifyWebhook(payload, header, secret)).toThrow('Invalid signature')
  })

  test('throws on expired timestamp (default 5 min)', () => {
    const oldTimestamp = Math.floor(Date.now() / 1000) - 400 // 6+ minutes ago
    const { header } = createSignature(payload, secret, oldTimestamp)

    expect(() => verifyWebhook(payload, header, secret)).toThrow(WebhookVerificationError)
    expect(() => verifyWebhook(payload, header, secret)).toThrow('Webhook timestamp too old')
  })

  test('accepts timestamp within maxAge', () => {
    const timestamp = Math.floor(Date.now() / 1000) - 200 // 3+ minutes ago
    const { header } = createSignature(payload, secret, timestamp)

    const result = verifyWebhook(payload, header, secret)
    expect(result).toEqual({ event: 'test', data: { id: 1 } })
  })

  test('respects custom maxAge option', () => {
    const timestamp = Math.floor(Date.now() / 1000) - 400 // 6+ minutes ago
    const { header } = createSignature(payload, secret, timestamp)

    // Should fail with default maxAge (300s)
    expect(() => verifyWebhook(payload, header, secret)).toThrow('Webhook timestamp too old')

    // Should pass with larger maxAge (600s)
    const result = verifyWebhook(payload, header, secret, { maxAge: 600 })
    expect(result).toEqual({ event: 'test', data: { id: 1 } })
  })

  test('throws on missing timestamp in header', () => {
    const sig = hmacSign(`123.${payload}`, secret)

    expect(() => verifyWebhook(payload, `v1=${sig}`, secret)).toThrow('Invalid signature header format')
  })

  test('throws on missing signature in header', () => {
    expect(() => verifyWebhook(payload, 't=123', secret)).toThrow('Invalid signature header format')
  })

  test('throws on invalid JSON payload', () => {
    const invalidPayload = 'not json'
    const { header } = createSignature(invalidPayload, secret)

    expect(() => verifyWebhook(invalidPayload, header, secret)).toThrow('Invalid JSON payload')
  })

  test('throws on tampered payload', () => {
    const { header } = createSignature(payload, secret)
    const tamperedPayload = JSON.stringify({ event: 'hacked', data: { id: 999 } })

    expect(() => verifyWebhook(tamperedPayload, header, secret)).toThrow('Invalid signature')
  })
})
