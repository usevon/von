# @usevon/sdk

TypeScript SDK for Von webhooks infrastructure. Zero dependencies, hand written types, works in Node, Bun, and browsers.

## Installation

```bash
bun add @usevon/sdk
```

## Quick Start

```typescript
import { Von } from '@usevon/sdk'

const von = new Von({
  baseUrl: 'https://api.usevon.com',
  apiKey: 'von_prod_xxx',
})

// Send an event, durable and exactly-once by default
const { data, error } = await von.send('order.created', {
  orderId: '123',
  amount: 99.99,
})

if (error) {
  console.error(error.message)
  return
}

console.log(data.id) // evt_xxx
```

`send` generates an idempotency key per event, so retries never create duplicates and every acknowledged event is already persisted. Pass your own key with `von.send(type, payload, { idempotencyKey })` to deduplicate across process restarts, or construct the client with `autoIdempotency: false` to use the faster buffered ingest path. `sendBatch(events)` works the same way per event. The raw request surface (`von.webhooks` and `von.endpoints`) stays available for everything else.

## Limits and billing

Payloads are capped at 1 MiB and rejected client-side before a request is made.

```typescript
import { PayloadTooLargeError, billableMessages } from '@usevon/sdk'

try {
  await von.send('report.generated', hugeReport)
} catch (error) {
  if (error instanceof PayloadTooLargeError) {
    console.error(`${error.bytes} bytes, limit is ${error.limit}`)
  }
}
```

Events are billed as messages, and every 64 KiB of payload counts as one more. A 200 KB event is one API call billed as four messages, which `billableMessages(bytes)` will tell you ahead of time. Retries are never billed.

## Handling limits

A 429 means one of two different things, so `limitKindOf` tells them apart.

```typescript
import { limitKindOf } from '@usevon/sdk'

const { error } = await von.send('order.created', order)

if (error) {
  const kind = limitKindOf(error)
  // "rate" clears within a second, so back off and retry
  // "quota" needs a bigger plan, so surface it to the user
}
```

`send` already retries rate limits for you when an idempotency key is present, so this matters most when you have disabled `autoIdempotency`.

## Webhooks

```typescript
// Send a single webhook
const { data, error } = await von.webhooks.send({
  eventType: 'user.created',
  payload: { userId: '123' },
  // optional - sends to specific endpoints
  endpointIds: ['ep_xxx'],
})

// Send multiple webhooks
const { data: batch } = await von.webhooks.sendBatch({
  events: [
    { eventType: 'order.created', payload: { orderId: '1' } },
    { eventType: 'order.created', payload: { orderId: '2' } },
  ],
})

// List webhook events
const { data: page1 } = await von.webhooks.list({ limit: 10 })
const { data: page2 } = await von.webhooks.list({
  limit: 10,
  cursor: page1?.nextCursor ?? undefined,
})

// Get a specific event
const { data: event } = await von.webhooks.get('evt_xxx')
```

## Endpoints

```typescript
// Create an endpoint, this is the only response that carries the plaintext secret
const { data: endpoint } = await von.endpoints.create({
  url: 'https://myapp.com/webhooks',
  description: 'Production webhook endpoint',
  maxAttempts: 5,
  timeoutMs: 30000,
  events: ['order.*', 'payment.failed'], // optional - filter by event type
})
console.log(endpoint?.secret)

// List endpoints
const { data } = await von.endpoints.list({ limit: 20 })

// Get an endpoint
const { data: one } = await von.endpoints.get('ep_xxx')

// Update an endpoint
const { data: updated } = await von.endpoints.update('ep_xxx', {
  status: 'paused',
})

// Delete an endpoint
await von.endpoints.delete('ep_xxx')

// Rotate the signing secret, the previous one stays valid until cleared
const { data: rotated } = await von.endpoints.rotateSecret('ep_xxx')
await von.endpoints.clearPreviousSecret('ep_xxx')

// Send a test delivery
const { data: test } = await von.endpoints.test('ep_xxx', {
  eventType: 'test.ping',
  payload: { hello: 'world' },
})
```

## Webhook Verification

Verify incoming webhooks from Von in your application:

```typescript
import { verifyWebhook, WebhookVerificationError } from '@usevon/sdk'

app.post('/webhooks', async (req) => {
  const payload = await req.text()
  const signature = req.headers.get('x-von-signature')

  try {
    const event = verifyWebhook(payload, signature, process.env.WEBHOOK_SECRET)
    console.log(event.type, event.data)
    return new Response('OK')
  } catch (err) {
    if (err instanceof WebhookVerificationError) {
      return new Response('Invalid signature', { status: 401 })
    }
    throw err
  }
})
```

## Error Handling

All methods return `{ data, error, status, response }` instead of throwing exceptions.

```typescript
const { data, error, status } = await von.endpoints.get('invalid-id')

if (error) {
  console.error(error.message)  // Error message from server
  console.error(status)         // HTTP status code (e.g., 404)
  return
}

console.log(data.url)
```

## Configuration

```typescript
const von = new Von({
  baseUrl: 'https://api.usevon.com',
  apiKey: 'von_prod_xxx',
})
```

Environment variables can be used instead of passing config directly:

```bash
VON_BASE_URL=https://api.usevon.com
VON_API_KEY=von_prod_xxx
```

## License

MIT - see [LICENSE-MIT](../../LICENSE-MIT)
