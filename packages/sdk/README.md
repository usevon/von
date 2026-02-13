# @usevon/sdk

TypeScript SDK for Von webhooks infrastructure. Built on Eden Treaty for end-to-end type safety.

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

// Send a webhook
const { data, error } = await von.webhooks.post({
  eventType: 'order.created',
  payload: { orderId: '123', amount: 99.99 },
})

if (error) {
  console.error(error.message)
  return
}

console.log(data.id) // evt_xxx
```

## Webhooks

```typescript
// Send a single webhook
const { data, error } = await von.webhooks.post({
  eventType: 'user.created',
  payload: { userId: '123' },
  // optional - sends to specific endpoints
  endpointIds: ['ep_xxx'],
})

// Send multiple webhooks
const { data: batch } = await von.webhooks.batch.post({
  events: [
    { eventType: 'order.created', payload: { orderId: '1' } },
    { eventType: 'order.created', payload: { orderId: '2' } },
  ],
})

// List webhook events
const { data: eventsPage1 } = await von.webhooks.get({ query: { limit: 10 } })
const { data: eventsPage2 } = await von.webhooks.get({
  query: { limit: 10, cursor: eventsPage1.nextCursor ?? undefined },
})

// Get a specific event
const { data: event } = await von.webhooks['evt_xxx'].get()
```

## Endpoints

```typescript
// Create an endpoint
const { data: endpoint } = await von.endpoints.post({
  url: 'https://myapp.com/webhooks',
  description: 'Production webhook endpoint',
  retryCount: 5,
  timeoutMs: 30000,
  events: ['order.*', 'payment.failed'], // optional - filter by event type
})

// List endpoints
const { data } = await von.endpoints.get()

// Get an endpoint
const { data: endpoint } = await von.endpoints['ep_xxx'].get()

// Update an endpoint
const { data: updated } = await von.endpoints['ep_xxx'].patch({
  enabled: false,
})

// Delete an endpoint
await von.endpoints['ep_xxx'].delete()
```

## Inbound

Receive webhooks from third-party services (Stripe, GitHub, etc.) through Von.

```typescript
// Create an inbound endpoint
const { data: inbound } = await von.inbound.post({
  name: 'Stripe Webhooks',
  provider: 'stripe',
  forwardUrl: 'https://myapp.com/stripe',
})

// List inbound endpoints
const { data } = await von.inbound.get()

// Get an inbound endpoint
const { data: inbound } = await von.inbound['in_xxx'].get()

// Update an inbound endpoint
const { data: updated } = await von.inbound['in_xxx'].patch({
  enabled: false,
})

// Delete an inbound endpoint
await von.inbound['in_xxx'].delete()
```

## Versions

Manage webhook payload versioning with field transforms.

```typescript
// Create a version
const { data: version } = await von.versions.post({
  version: '2024-06-01',
  transforms: {
    'product.updated': {
      rename: { features: 'items' },
      remove: ['internalField'],
      defaults: { legacyField: null },
    },
  },
})

// List versions
const { data } = await von.versions.get()

// Get a version
const { data: version } = await von.versions['2024-06-01'].get()

// Update a version
const { data: updated } = await von.versions['2024-06-01'].patch({
  transforms: { 'product.updated': { rename: { features: 'newItems' } } },
})

// Delete a version
await von.versions['2024-06-01'].delete()
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
const { data, error, status } = await von.endpoints['invalid-id'].get()

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
