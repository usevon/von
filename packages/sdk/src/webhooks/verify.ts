import { hmacSign, timingSafeEqual } from '@usevon/utils'

export class WebhookVerificationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'WebhookVerificationError'
  }
}

type VerifyOptions = {
  maxAge?: number
}

export function verifyWebhook<T = unknown>(
  payload: string,
  signatureHeader: string,
  secret: string,
  options?: VerifyOptions
): T {
  const maxAge = options?.maxAge ?? 300

  const parts = signatureHeader.split(',')
  let timestamp: number | null = null
  let signature: string | null = null

  for (const part of parts) {
    const [key, value] = part.split('=')
    if (key === 't') timestamp = parseInt(value, 10)
    if (key === 'v1') signature = value
  }

  if (!timestamp || !signature) {
    throw new WebhookVerificationError('Invalid signature header format')
  }

  const now = Math.floor(Date.now() / 1000)
  if (now - timestamp > maxAge) {
    throw new WebhookVerificationError('Webhook timestamp too old')
  }

  const signedPayload = `${timestamp}.${payload}`
  const expected = hmacSign(signedPayload, secret)

  if (!timingSafeEqual(expected, signature)) {
    throw new WebhookVerificationError('Invalid signature')
  }

  try {
    return JSON.parse(payload) as T
  } catch {
    throw new WebhookVerificationError('Invalid JSON payload')
  }
}
