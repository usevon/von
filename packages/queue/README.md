# @usevon/queue

Job queue and Redis client for Von, built on BullMQ with ioredis.

## Usage

```typescript
import { getWebhookDeliveryQueue } from "@usevon/queue"

const queue = getWebhookDeliveryQueue()

await queue.add("deliver", {
  deliveryId: "del_xxx",
  eventId: "evt_xxx",
  payload: JSON.stringify({ orderId: "123" }),
  eventType: "order.created",
  endpoint: { id: "ep_xxx", url: "https://example.com/webhooks", ... },
  organizationId: "org_xxx",
})
```

## Queues

Two queues handle webhook processing:

- `webhook-delivery` for outbound webhook delivery
- `inbound-forwarding` for forwarding inbound webhooks to consumer URLs

Both use lazy singleton factories (`getWebhookDeliveryQueue`, `getInboundForwardingQueue`) that create dedicated Redis connections on first access.

## Redis Client

The package also provides a shared Redis client for non-queue usage like caching and rate limiting:

```typescript
import { getRedisClient, checkRedisConnection, closeRedis } from "@usevon/queue"

const redis = getRedisClient()
await redis.set("key", "value")

// Health check
const { ok } = await checkRedisConnection()

// Graceful shutdown
await closeRedis()
```

## License

AGPL-3.0 - see [LICENSE-AGPL](../../LICENSE-AGPL)
