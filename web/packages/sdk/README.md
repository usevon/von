# @usevon/sdk

TypeScript SDK for Von webhooks.

## Installation

```bash
bun add @usevon/sdk
```

## Usage

```typescript
import { von, VonSDK } from '@usevon/sdk';

// Use the default instance
await von.send({
  to: 'https://customer.com/webhook',
  event: 'order.created',
  data: { orderId: '123' },
});

// Or create a custom instance
const client = new VonSDK({
  apiUrl: 'http://localhost:3000',
  apiKey: 'your-api-key',
});

await client.send({
  to: 'https://customer.com/webhook',
  event: 'order.created',
  data: { orderId: '123' },
});
```

## License

MIT - see [LICENSE-MIT](../../../LICENSE-MIT)
