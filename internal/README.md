# Von - Internal Architecture

Private implementation packages for Von webhooks infrastructure.

## Architecture

```
User → API Server → RabbitMQ → Worker → Customer Endpoint
         ↓            ↓           ↓
    PostgreSQL   PostgreSQL  PostgreSQL
```

## Packages

- `api/` - HTTP API handlers (Chi router)
- `db/` - Database connection and migrations (GORM)
- `queue/` - RabbitMQ publisher and consumer wrappers
- `worker/` - Webhook delivery worker with retry logic
- `middleware/` - HTTP middleware (idempotency, auth)
- `util/` - Shared helper functions
- `tunnel/` - WebSocket tunnel for local development
- `usage/` - Usage tracking and rate limiting

## Webhook Delivery Flow

1. **Event Creation** - User sends event via `POST /v1/events`
   ```json
   {
     "application_id": "app_123",
     "event_type": "user.created",
     "payload": {"user_id": 456}
   }
   ```

2. **Endpoint Matching** - API finds endpoints subscribed to event type
   - Checks `EventFilters` and `FilterMode` (allow/block)
   - Creates `EventDelivery` record for each matching endpoint

3. **Queue Publishing** - API publishes to RabbitMQ `webhook` queue
   ```go
   QueueMessage{
     delivery_id, event_id, endpoint_id,
     url: "https://customer.com/webhook",
     payload, headers, secret
   }
   ```

4. **Worker Processing** - Worker consumes from queue and:
   - Checks circuit breaker state (prevent cascading failures)
   - Makes HTTP POST to endpoint URL
   - Generates HMAC signature (SHA256/SHA512)
   - Updates delivery status (queued → processing → success/failed)
   - Creates `DeliveryAttempt` record

5. **Retry Logic** - On failure:
   - Exponential backoff calculation
   - Requeue to RabbitMQ with delay
   - Circuit breaker opens after 5 consecutive failures
   - Poison queue (DLX) for permanently failed messages

## Key Concepts

**Event** - Incoming webhook payload to fan out (e.g., "user.created")

**Endpoint** - Destination URL where webhooks get delivered
- Has signing secret, custom headers, event filters
- Tracks health score and consecutive failures

**Delivery** - Individual attempt to send event to endpoint
- Status: queued, processing, success, failed
- Tracks attempt count and next retry time

**Delivery Attempt** - Single HTTP request attempt
- Stores request/response details
- Used for debugging and delivery history

## Fault Tolerance

- **Circuit Breaker** - Per-endpoint state tracking (Closed/Open/Half-Open)
- **Idempotency** - HTTP middleware with `Idempotency-Key` header (24h TTL)
- **Poison Queue** - Dead Letter Exchange for max retries exceeded
- **Health Scoring** - Endpoint health score decreases on failures
