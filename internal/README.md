# Von - Internal Architecture

Private implementation packages for Von webhooks infrastructure.

## Packages

### Core Services
- `api/` - HTTP API handlers using Chi router
- `worker/` - Webhook delivery worker with retry logic and fault tolerance
- `queue/` - RabbitMQ publisher and consumer wrappers

### Infrastructure
- `db/` - PostgreSQL connection and migrations using GORM
- `middleware/` - HTTP middleware (idempotency, authentication)
- `util/` - Shared helper functions

### Features
- `tunnel/` - WebSocket tunnel for local webhook development
- `usage/` - Usage tracking and rate limiting

## Webhook Delivery Flow

1. User posts event to API server
2. API finds endpoints subscribed to event type based on filters
3. API creates delivery records and publishes to RabbitMQ
4. Worker consumes queue and makes HTTP POST to endpoint URL
5. On failure, exponential backoff and requeue with delay
6. Circuit breaker opens after 5 consecutive failures to prevent cascading issues

## Key Concepts

- **Event** - Incoming webhook payload to fan out (e.g., "user.created")
- **Endpoint** - Destination URL where webhooks are delivered with signing secret and filters
- **Delivery** - Individual attempt to send event to endpoint (queued, processing, success, failed)
- **Delivery Attempt** - Single HTTP request with full request/response details for debugging

## Fault Tolerance

- **Circuit Breaker** - Per-endpoint state tracking to prevent cascading failures
- **Idempotency** - Middleware with `Idempotency-Key` header and 24h TTL
- **Poison Queue** - Dead Letter Exchange captures permanently failed messages
- **Health Scoring** - Endpoint health score updates based on delivery success rate
