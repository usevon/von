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
const { data, error } = await von.webhooks.send({
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
const { data: events } = await von.webhooks.list({ limit: 10, offset: 0 })

// Get a specific event
const { data: event } = await von.webhooks.get('evt_xxx')
```

## Endpoints

```typescript
// Create an endpoint
const { data: endpoint } = await von.endpoints.create({
  url: 'https://myapp.com/webhooks',
  description: 'Production webhook endpoint',
  retryCount: 5,
  timeoutMs: 30000,
  events: ['order.*', 'payment.failed'], // optional - filter by event type
})

// List endpoints
const { data } = await von.endpoints.list()

// Get an endpoint
const { data: endpoint } = await von.endpoints.get('ep_xxx')

// Update an endpoint
const { data: updated } = await von.endpoints.update('ep_xxx', {
  enabled: false,
})

// Delete an endpoint
await von.endpoints.delete('ep_xxx')
```

## Inbound

Receive webhooks from third-party services (Stripe, GitHub, etc.) through Von.

```typescript
// Create an inbound endpoint
const { data: inbound } = await von.inbound.create({
  name: 'Stripe Webhooks',
  provider: 'stripe',
  forwardUrl: 'https://myapp.com/stripe',
})

// List inbound endpoints
const { data } = await von.inbound.list()

// Get an inbound endpoint
const { data: inbound } = await von.inbound.get('in_xxx')

// Update an inbound endpoint
const { data: updated } = await von.inbound.update('in_xxx', {
  enabled: false,
})

// Delete an inbound endpoint
await von.inbound.delete('in_xxx')
```

## Versions

Manage webhook payload versioning with field transforms.

```typescript
// Create a version
const { data: version } = await von.versions.create({
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
const { data } = await von.versions.list()

// Get a version
const { data: version } = await von.versions.get('2024-06-01')

// Update a version
const { data: updated } = await von.versions.update('2024-06-01', {
  transforms: { 'product.updated': { rename: { features: 'newItems' } } },
})

// Delete a version
await von.versions.delete('2024-06-01')
```

## Error Handling

All methods return `{ data, error }` instead of throwing exceptions.

```typescript
const { data, error } = await von.endpoints.get('invalid-id')

if (error) {
  console.error(error.message)    // "Request failed with status 404"
  console.error(error.status)     // 404
  console.error(error.statusText) // "Not Found"
  return
}

console.log(data.url)
```

## Configuration

```typescript
const von = new Von({
  baseUrl: 'https://api.usevon.com',
  apiKey: 'von_prod_xxx',
  retry: {
    type: 'exponential',
    attempts: 3,
    baseDelay: 1000,
    maxDelay: 10000,
  },
  timeout: 30000,
})
```

Environment variables can be used instead of passing config directly:

```bash
VON_BASE_URL=https://api.usevon.com
VON_API_KEY=von_prod_xxx
```

POST, PUT, and PATCH requests are automatically idempotent with a unique key generated per request and responses cached server-side for 24 hours.

## Testing

See the [tests](./tests) for more examples:

- [client.test.ts](./tests/client.test.ts) - Client initialization and request handling
- [webhooks.test.ts](./tests/webhooks.test.ts) - Webhook operations
- [endpoints.test.ts](./tests/endpoints.test.ts) - Endpoint management
- [inbound.test.ts](./tests/inbound.test.ts) - Inbound endpoint management
- [versions.test.ts](./tests/versions.test.ts) - Version management

```bash
bun test
```

## License

MIT - see [LICENSE-MIT](../../LICENSE-MIT)
