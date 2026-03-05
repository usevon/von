# @usevon/types

Shared TypeScript type definitions for Von.

## Usage

```typescript
import type { Endpoint, WebhookEvent, SendEvent } from "@usevon/types"
```

## Types

### Endpoints

Outbound webhook destinations where events get delivered. Each endpoint has a url, status, version, retry config, and optional event filters.

`Endpoint`, `CreateEndpoint`, `UpdateEndpoint`, `EndpointStatus`

### Inbound

Inbound endpoints receive webhooks from external providers and forward them to your app.

`InboundEndpoint`, `CreateInboundEndpoint`, `UpdateInboundEndpoint`, `InboundDelivery`

### Webhooks

Webhook events, delivery tracking, and send operations. Covers the full lifecycle from sending an event to recording each delivery attempt.

`WebhookEvent`, `WebhookDelivery`, `WebhookDeliveryAttempt`, `SendEvent`, `SendBatch`, `DeliveryResponse`

### Versions

Webhook payload versioning with per-event-type transform rules for field renames, removals, and defaults.

`WebhookVersion`, `TransformMappings`

This package has no runtime dependencies.

## License

MIT - see [LICENSE-MIT](../../LICENSE-MIT)
