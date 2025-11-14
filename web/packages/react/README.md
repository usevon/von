# @usevon/react

React hooks and context provider for Von webhooks.

## Installation

```bash
bun add @usevon/react
```

## Usage

### Setup Provider

Wrap your app with `VonProvider`:

```typescript
import { VonProvider } from '@usevon/react';

const App = () => {
  return (
    <VonProvider apiUrl="http://localhost:3000" apiKey="your-api-key">
      <YourApp />
    </VonProvider>
  );
};
```

### Use in Components

Access the SDK using `useVon` hook:

```typescript
import { useVon } from '@usevon/react';

const SendWebhook = () => {
  const von = useVon();

  const handleSend = async () => {
    const result = await von.send({
      to: 'https://customer.com/webhook',
      event: 'order.created',
      data: { orderId: '123' },
    });

    console.log(result);
  };

  return <button onClick={handleSend}>Send Webhook</button>;
};
```

## License

MIT - see [LICENSE-MIT](../../../LICENSE-MIT)

