# Von - Internal Architecture

<p align="center">
  <a href="https://golang.org/"><img src="https://img.shields.io/badge/Go-1.24+-blue.svg" alt="Go"></a>
  <a href="../LICENSE-AGPL"><img src="https://img.shields.io/badge/License-AGPL--3.0-blue.svg" alt="License: AGPL-3.0"></a>
</p>

Internal implementation packages for Von webhooks infrastructure.

## Packages

- `api/` - HTTP REST API server (Chi router, handlers, middleware)
- `worker/` - Webhook delivery worker (RabbitMQ consumer, HTTP client)
- `db/` - PostgreSQL database layer (GORM, migrations)
- `queue/` - RabbitMQ publishers, consumers, and DLX handling
- `usage/` - Usage tracking and metrics collection
- `tunnel/` - Webhook tunneling for local development
- `middleware/` - HTTP middleware (idempotency, rate limiting)
- `util/` - Shared utilities and helpers

## Webhook Lifecycle

1. API validates incoming events and saves them to PostgreSQL
2. System matches endpoints subscribed to the event type using filters
3. Delivery jobs published to RabbitMQ for async processing
4. Workers consume jobs and send signed HTTP POST requests
5. Attempts tracked with status, latency, and full request/response details
6. Failed deliveries retry automatically with exponential backoff and circuit breaker

**Example:** When you post an event with type `order.created`:

1. Von looks at ALL endpoints to see which ones want this event
2. An endpoint might have filters like:
   - `order.created` (exact match)
   - `order.*` (wildcard - matches order.created, order.updated, etc.)
   - `*` (all events)
3. For each endpoint that matches, Von creates one delivery job

So if you have:
- Endpoint A with filter `order.*`
- Endpoint B with filter `order.created`
- Endpoint C with filter `user.*`

When `order.created` is posted, Von queues 2 delivery jobs (one for Endpoint A, one for Endpoint B). Endpoint C is ignored.

## License

AGPL-3.0 - see [LICENSE-AGPL](../LICENSE-AGPL)
