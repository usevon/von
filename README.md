# Von

<p align="center">
  <a href="https://golang.org/"><img src="https://img.shields.io/badge/Go-1.24+-blue.svg" alt="Go"></a>
  <a href="https://www.postgresql.org/"><img src="https://img.shields.io/badge/Postgres-18-blue.svg" alt="Postgres"></a>
  <a href="https://www.rabbitmq.com/"><img src="https://img.shields.io/badge/RabbitMQ-4-orange.svg" alt="RabbitMQ"></a>
  <a href="LICENSE-MIT"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT"></a>
  <a href="LICENSE-AGPL"><img src="https://img.shields.io/badge/License-AGPL--3.0-blue.svg" alt="License: AGPL-3.0"></a>
</p>

Von is the open-source webhooks infrastructure built with Go and RabbitMQ for automatic retries, signature verification, and horizontal scaling.

## Features

- **Automatic retries** - Exponential backoff with configurable retry attempts
- **Signature verification** - HMAC SHA-256/512 signature generation and validation
- **Distributed workers** - Horizontally scalable worker servers consuming from RabbitMQ
- **Usage tracking** - Real-time metrics aggregation for billing and analytics
- **Dev tunnel** - WebSocket-based tunnel for local webhook testing
- **Dashboard** - Web UI for monitoring webhook logs and attempts

## SDKs

- **Go** - [pkg/von](pkg/von)
- **TypeScript** - [@usevon/sdk](web/packages/sdk)
- **React** - [@usevon/react](web/packages/react)

## Environments

Von supports Development, Staging, and Production environments, allowing you to test webhooks before deploying to production.

## Testing

Von includes unit tests, integration tests, and end-to-end tests covering the complete webhook delivery flow.

**Requirements:** Tests require PostgreSQL and RabbitMQ running locally. See [CONTRIBUTING.md](.github/CONTRIBUTING.md) for setup.

```bash
# Run all tests
go test ./...

# Run specific tests
go test ./tests/e2e/...           # End-to-end tests
go test ./tests/api/...           # API integration tests
go test ./tests/worker/...        # Worker integration tests
go test ./tests/queue/...         # Queue integration tests
go test ./tests/usage/...         # Usage tracking integration tests
go test ./tests/middleware/...    # Middleware integration tests
go test ./internal/worker/...     # Unit tests
```

## Benchmarks

Von includes benchmarks for queue publishing, worker delivery, and unit performance.

```bash
# Run all benchmarks with formatted output
go test -run=TestRunAllBenchmarks ./tests -v

# Run all benchmarks directly
go test ./... -bench=.

# Run specific benchmarks
go test ./tests/queue/... -bench=.      # Queue publishing benchmarks
go test ./tests/worker/... -bench=.     # Worker HTTP client benchmarks
go test ./internal/worker/... -bench=.  # Retry and circuit breaker benchmarks
```

**Benchmark Environment:** AMD Ryzen 7 3700X, 32GB RAM, Windows 11, PostgreSQL 18, RabbitMQ 4 (localhost)

Iterations show the number of times each operation ran, and latency measures nanoseconds per operation.

```
---------------------------------------------------------------------------
End-to-End                                     Iterations   Latency (ns/op)
---------------------------------------------------------------------------
EndToEndSingleDelivery-16                              43          30241788
EndToEndMultipleEndpoints-16                            8         138535038
EndToEndHighConcurrency-16                            225           4684244
EndToEndLargePayload-16                                27          37812841
EndToEndQueuePublishAndConsume-16                     324           4073621
---------------------------------------------------------------------------
API Endpoints                                  Iterations   Latency (ns/op)
---------------------------------------------------------------------------
CreateEventHandler-16                                 226           4941741
CreateEventHandlerMultipleEndpoints-16                249           4973821
CreateEventHandlerLargePayload-16                     171           6555243
ListDeliveriesHandler-16                              763           1706974
CreateEndpointHandler-16                              284           5406212
ListEndpointsHandler-16                               840           1506698
RetryDeliveryHandler-16                               109          11314927
---------------------------------------------------------------------------
Queue Publishing                               Iterations   Latency (ns/op)
---------------------------------------------------------------------------
Publisher-16                                        31978             36909
PublisherParallel-16                                33364             36167
Publisher1KB-16                                     26173             42218
Publisher10KB-16                                    15972             72515
Publisher100KB-16                                    6226            319931
Publisher1MB-16                                       564           2387219
PublisherBatch-16                                     336           3675338
PublisherFlatJSON-16                                29234             41191
PublisherNestedJSON-16                              26210             49553
---------------------------------------------------------------------------
Worker HTTP Client                             Iterations   Latency (ns/op)
---------------------------------------------------------------------------
HandleMessage-16                                       40          29446652
HandleMessageParallel-16                              256           4420063
DeliverWebhook-16                                    6075            172096
DeliverWebhookParallel-16                           66099             18787
DeliverWebhookLargePayload-16                        1923            558158
---------------------------------------------------------------------------
Circuit Breaker & Retry                        Iterations   Latency (ns/op)
---------------------------------------------------------------------------
CBIsOpen-16                                      32961417             42.38
CBRecordSuccess-16                               34454540             38.71
CBRecordFailure-16                               20742784             58.26
CBGetState-16                                    46809538             25.64
CBReset-16                                       44783304             27.82
CBConcurrentIsOpen-16                             9419698             125.4
CBConcurrentRecordSuccess-16                      8930232             134.3
CBConcurrentRecordFailure-16                      6802050             194.3
CBConcurrentMixed-16                              6710594             167.6
CBMultipleEndpoints-16                           30431750             39.27
CBStateTransitions-16                             1602039             791.5
CBConcurrentMultiEndpoints-16                     8798311             134.1
CBHighContention-16                                 26955             46387
CalculateBackoffExponential-16                    7863829             154.3
CalculateBackoffLinear-16                        11666421             106.0
CalculateBackoffConstant-16                      11868777             111.3
ShouldRetry-16                                 1000000000            0.2711
ExponentialBackoff-16                             6808170             182.5
LinearBackoff-16                                 11719219             103.0
ConstantBackoff-16                               12010773             97.70
CalculateBackoffVariousAttempts/1-16             11118255             110.5
CalculateBackoffVariousAttempts/3-16              7311883             150.8
CalculateBackoffVariousAttempts/5-16              7339726             158.8
CalculateBackoffVariousAttempts/10-16             7370757             175.7
CalculateBackoffVariousAttempts/20-16             6406101             203.6
---------------------------------------------------------------------------
```

## Contributing

Von is open source and welcomes contributions, issues, and feedback.

See [CONTRIBUTING.md](.github/CONTRIBUTING.md) for development setup and guidelines.

## Security

For security concerns, see our [Security Policy](.github/SECURITY.md).

## License

Von uses dual licensing:

**AGPL-3.0 License** ([LICENSE-AGPL](LICENSE-AGPL))
- `cmd/` - Server binaries (API, Worker, CLI)
- `internal/` - Backend implementation
- `web/apps/` - Web applications (Dashboard, Landing)

**MIT License** ([LICENSE-MIT](LICENSE-MIT))
- `pkg/von/` - Go SDK
- `web/packages/sdk/` - TypeScript SDK
- `web/packages/react/` - React hooks and components
- `web/packages/ui/` - UI component library
