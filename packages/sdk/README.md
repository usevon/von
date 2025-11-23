# Von - @usevon/sdk

<p align="center">
  <a href="../../../LICENSE-MIT"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT"></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5.0+-blue.svg" alt="TypeScript"></a>
</p>

TypeScript client library for interacting with Von's webhooks infrastructure.

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
