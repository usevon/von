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
EndToEndSingleDelivery-16                              18          64784672
EndToEndMultipleEndpoints-16                            3         365147233
EndToEndHighConcurrency-16                            133           8749968
EndToEndLargePayload-16                                21          68768133
EndToEndQueuePublishAndConsume-16                     429           2789414
---------------------------------------------------------------------------
API Endpoints                                  Iterations   Latency (ns/op)
---------------------------------------------------------------------------
CreateEventHandler-16                                 241           4637471
CreateEventHandlerMultipleEndpoints-16                 10         121090850
CreateEventHandlerLargePayload-16                      66          17372856
ListDeliveriesHandler-16                              703           1732639
CreateEndpointHandler-16                              243           4759503
ListEndpointsHandler-16                               859           1246936
RetryDeliveryHandler-16                               259           4683992
---------------------------------------------------------------------------
Queue Publishing                               Iterations   Latency (ns/op)
---------------------------------------------------------------------------
Publisher-16                                        34357             35297
PublisherParallel-16                                33022             35510
Publisher1KB-16                                     30721             38993
Publisher10KB-16                                    17134             68424
Publisher100KB-16                                    6679            246311
Publisher1MB-16                                       811           2162636
PublisherBatch-16                                     308           3686115
PublisherFlatJSON-16                                30151             37273
PublisherNestedJSON-16                              27884             43664
---------------------------------------------------------------------------
Worker HTTP Client                             Iterations   Latency (ns/op)
---------------------------------------------------------------------------
HandleMessage-16                                       38          30664082
HandleMessageParallel-16                              248           5483753
DeliverWebhook-16                                    6572            207464
DeliverWebhookParallel-16                           22464             50725
DeliverWebhookLargePayload-16                        2113            586150
---------------------------------------------------------------------------
Circuit Breaker & Retry                        Iterations   Latency (ns/op)
---------------------------------------------------------------------------
CBIsOpen-16                                      34296198             37.05
CBRecordSuccess-16                               35894720             36.98
CBRecordFailure-16                               23442673             54.86
CBGetState-16                                    49001592             23.20
CBReset-16                                       49598253             27.33
CBConcurrentIsOpen-16                             9819452             125.6
CBConcurrentRecordSuccess-16                     10048904             109.9
CBConcurrentRecordFailure-16                      7481418             159.0
CBConcurrentMixed-16                              8487060             144.6
CBMultipleEndpoints-16                           34085776             35.31
CBStateTransitions-16                             1713336             711.1
CBConcurrentMultiEndpoints-16                    10298059             117.7
CBHighContention-16                                 28897             41017
CalculateBackoffExponential-16                    7575283             151.3
CalculateBackoffLinear-16                        11743371             101.0
CalculateBackoffConstant-16                      12343582             97.32
ShouldRetry-16                                 1000000000            0.2492
ExponentialBackoff-16                             7246726             166.3
LinearBackoff-16                                 12221228             102.1
ConstantBackoff-16                               11920264             106.4
CalculateBackoffVariousAttempts/1-16             11390656             107.3
CalculateBackoffVariousAttempts/3-16              8251789             141.0
CalculateBackoffVariousAttempts/5-16              7156556             148.4
CalculateBackoffVariousAttempts/:-16              8313380             144.0
CalculateBackoffVariousAttempts/D-16              7159724             169.3
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
