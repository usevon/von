# @usevon/sdk

TypeScript SDK for Von webhooks infrastructure.

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
const event = await von.webhooks.send({
  eventType: 'order.created',
  payload: { orderId: '123', amount: 99.99 },
})

console.log(event.id) // evt_xxx
```

## Webhooks

```typescript
// Send a single webhook
const event = await von.webhooks.send({
  eventType: 'user.created',
  payload: { userId: '123' },
  // optional
  idempotencyKey: 'user-123-created',
  // optional - sends to specific endpoints
  endpointIds: ['ep_xxx'],
})

// Send multiple webhooks
const batch = await von.webhooks.sendBatch({
  events: [
    { eventType: 'order.created', payload: { orderId: '1' } },
    { eventType: 'order.created', payload: { orderId: '2' } },
  ],
})

// List webhook events
const { events, total } = await von.webhooks.list({ limit: 10, offset: 0 })

// Get a specific event
const event = await von.webhooks.get('evt_xxx')
```

## Endpoints

```typescript
// Create an endpoint
const endpoint = await von.endpoints.create({
  url: 'https://myapp.com/webhooks',
  description: 'Production webhook endpoint',
  retryCount: 5,
  timeoutMs: 30000,
})

// List endpoints
const { endpoints, total } = await von.endpoints.list()

// Get an endpoint
const endpoint = await von.endpoints.get('ep_xxx')

// Update an endpoint
const updated = await von.endpoints.update('ep_xxx', {
  enabled: false,
})

// Delete an endpoint
await von.endpoints.delete('ep_xxx')
```

## Inbound

Receive webhooks from third-party services (Stripe, GitHub, etc.) through Von.

```typescript
// Create an inbound endpoint
const inbound = await von.inbound.create({
  name: 'Stripe Webhooks',
  provider: 'stripe',
  forwardUrl: 'https://myapp.com/stripe',
})

// List inbound endpoints
const { inboundEndpoints, total } = await von.inbound.list()

// Get an inbound endpoint
const inbound = await von.inbound.get('in_xxx')

// Update an inbound endpoint
const updated = await von.inbound.update('in_xxx', {
  enabled: false,
})

// Delete an inbound endpoint
await von.inbound.delete('in_xxx')
```

## Error Handling

The SDK throws `VonError` on API errors:

```typescript
import { Von, VonError } from '@usevon/sdk'

try {
  await von.endpoints.get('invalid-id')
} catch (e) {
  if (e instanceof VonError) {
    console.error(e.message)    // "Endpoint not found"
    console.error(e.code)       // "NOT_FOUND"
    console.error(e.statusCode) // 404
  }
}
```

## Configuration

```typescript
const von = new Von({
  // defaults to http://localhost:3000
  baseUrl: 'https://api.usevon.com',
  // or set VON_API_KEY env var
  apiKey: 'von_prod_xxx',
})

// Environment variables
// VON_BASE_URL - API base URL
// VON_API_KEY  - API key
```

## Testing

See the [test suite](./tests) for more examples:

- [client.test.ts](./tests/client.test.ts) - Client initialization and request handling
- [webhooks.test.ts](./tests/webhooks.test.ts) - Webhook operations
- [endpoints.test.ts](./tests/endpoints.test.ts) - Endpoint management
- [inbound.test.ts](./tests/inbound.test.ts) - Inbound endpoint management
- [error.test.ts](./tests/error.test.ts) - Error handling

```bash
bun test
```

## License

MIT - see [LICENSE-MIT](../../LICENSE-MIT)
