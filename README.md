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
Queue Publishing                               Iterations   Latency (ns/op)
---------------------------------------------------------------------------
Publisher-16                                        33765             36662
PublisherParallel-16                                33884             36281
Publisher1KB-16                                     29968             39893
Publisher10KB-16                                    16158             70539
Publisher100KB-16                                    6295            206761
Publisher1MB-16                                       796           2385016
PublisherBatch-16                                     327           3687425
PublisherFlatJSON-16                                27982             38564
PublisherNestedJSON-16                              27504             45872
---------------------------------------------------------------------------
Worker HTTP Client                             Iterations   Latency (ns/op)
---------------------------------------------------------------------------
DeliverWebhook-16                                    5511            194544
DeliverWebhookParallel-16                            7868            150564
DeliverWebhookLargePayload-16                        1765            621465
---------------------------------------------------------------------------
Circuit Breaker & Retry                        Iterations   Latency (ns/op)
---------------------------------------------------------------------------
CBIsOpen-16                                      34403077             36.89
CBRecordSuccess-16                               34718203             36.67
CBRecordFailure-16                               20417398             57.73
CBGetState-16                                    51637555             25.41
CBReset-16                                       45209318             27.64
CBConcurrentIsOpen-16                            10069461             120.8
CBConcurrentRecordSuccess-16                      9330758             118.2
CBConcurrentRecordFailure-16                      7237796             167.0
CBConcurrentMixed-16                              7930742             163.0
CBMultipleEndpoints-16                           27240532             37.25
CBStateTransitions-16                             1488480             758.6
CBConcurrentMultiEndpoints-16                     8977358             133.1
CBHighContention-16                                 22366             48380
CalculateBackoffExponential-16                    8380368             151.1
CalculateBackoffLinear-16                        10790173             106.1
CalculateBackoffConstant-16                      11956466             106.2
ShouldRetry-16                                 1000000000            0.2572
ExponentialBackoff-16                             7012044             175.1
LinearBackoff-16                                 11183252             101.1
ConstantBackoff-16                               11944790             100.1
CalculateBackoffVariousAttempts/1-16             10967988             109.3
CalculateBackoffVariousAttempts/3-16              6809062             161.6
CalculateBackoffVariousAttempts/5-16              8220726             149.1
CalculateBackoffVariousAttempts/:-16              8188778             151.1
CalculateBackoffVariousAttempts/D-16              6484551             187.2
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
