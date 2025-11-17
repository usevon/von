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
EndToEndSingleDelivery-16                              32          38340391
EndToEndMultipleEndpoints-16                            7         155858814
EndToEndHighConcurrency-16                            282           4071902
EndToEndLargePayload-16                                37          41078681
EndToEndQueuePublishAndConsume-16                     284           4204857
---------------------------------------------------------------------------
API Endpoints                                  Iterations   Latency (ns/op)
---------------------------------------------------------------------------
CreateEventHandler-16                                 234           5123507
CreateEventHandlerMultipleEndpoints-16                214           5659201
CreateEventHandlerLargePayload-16                     170           6898909
ListDeliveriesHandler-16                              759           1530561
CreateEndpointHandler-16                              255           4588575
ListEndpointsHandler-16                               840           1570421
RetryDeliveryHandler-16                               120          10494419
---------------------------------------------------------------------------
Queue Publishing                               Iterations   Latency (ns/op)
---------------------------------------------------------------------------
Publisher-16                                        30157             37272
PublisherParallel-16                                33022             37328
Publisher1KB-16                                     30115             39557
Publisher10KB-16                                    16660             81888
Publisher100KB-16                                    4034            255549
Publisher1MB-16                                       637           2172561
PublisherBatch-16                                     333           3575617
PublisherFlatJSON-16                                30554             38296
PublisherNestedJSON-16                              27583             45627
---------------------------------------------------------------------------
Worker HTTP Client                             Iterations   Latency (ns/op)
---------------------------------------------------------------------------
HandleMessage-16                                       42          27360343
HandleMessageParallel-16                              321           3718575
DeliverWebhook-16                                    7264            151920
DeliverWebhookParallel-16                           77023             15528
DeliverWebhookLargePayload-16                        2305            507464
---------------------------------------------------------------------------
Circuit Breaker & Retry                        Iterations   Latency (ns/op)
---------------------------------------------------------------------------
CBIsOpen-16                                      34098174             40.11
CBRecordSuccess-16                               34097398             33.92
CBRecordFailure-16                               23274397             59.24
CBGetState-16                                    49516593             23.58
CBReset-16                                       45685916             26.30
CBConcurrentIsOpen-16                            11235481             108.1
CBConcurrentRecordSuccess-16                     11017047             105.9
CBConcurrentRecordFailure-16                      7534351             152.6
CBConcurrentMixed-16                              8687272             160.9
CBMultipleEndpoints-16                           33595282             34.48
CBStateTransitions-16                             1689458             853.2
CBConcurrentMultiEndpoints-16                     9160472             118.2
CBHighContention-16                                 32214             37904
CalculateBackoffExponential-16                    8541253             144.2
CalculateBackoffLinear-16                        11961006             100.9
CalculateBackoffConstant-16                      11420424             99.34
ShouldRetry-16                                 1000000000            0.3489
ExponentialBackoff-16                             7112678             168.1
LinearBackoff-16                                 12202971             98.28
ConstantBackoff-16                               12783282             93.88
CalculateBackoffVariousAttempts/1-16             11617662             104.5
CalculateBackoffVariousAttempts/3-16              8506572             140.3
CalculateBackoffVariousAttempts/5-16              8447515             145.2
CalculateBackoffVariousAttempts/10-16             7525638             164.3
CalculateBackoffVariousAttempts/20-16             7028534             177.9
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
