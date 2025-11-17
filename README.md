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
EndToEndSingleDelivery-16                              43          30573716
EndToEndMultipleEndpoints-16                            7         147944971
EndToEndHighConcurrency-16                            265           4641833
EndToEndLargePayload-16                                34          36578062
EndToEndQueuePublishAndConsume-16                     297           4222155
---------------------------------------------------------------------------
API Endpoints                                  Iterations   Latency (ns/op)
---------------------------------------------------------------------------
CreateEventHandler-16                                 250           4862613
CreateEventHandlerMultipleEndpoints-16                228           5841507
CreateEventHandlerLargePayload-16                     163           6889694
ListDeliveriesHandler-16                              813           1545961
CreateEndpointHandler-16                              271           4271858
ListEndpointsHandler-16                               729           1715088
RetryDeliveryHandler-16                                79          12926313
---------------------------------------------------------------------------
Queue Publishing                               Iterations   Latency (ns/op)
---------------------------------------------------------------------------
Publisher-16                                        33586             35555
PublisherParallel-16                                34650             35192
Publisher1KB-16                                     30560             39653
Publisher10KB-16                                    17805             70377
Publisher100KB-16                                    5932            263998
Publisher1MB-16                                       627           2594156
PublisherBatch-16                                     336           3819227
PublisherFlatJSON-16                                30019             40465
PublisherNestedJSON-16                              26157             45166
---------------------------------------------------------------------------
Worker HTTP Client                             Iterations   Latency (ns/op)
---------------------------------------------------------------------------
HandleMessage-16                                       45          26569576
HandleMessageParallel-16                              279           4167867
DeliverWebhook-16                                    5062            211220
DeliverWebhookParallel-16                           63554             17955
DeliverWebhookLargePayload-16                        2116            546919
---------------------------------------------------------------------------
Circuit Breaker & Retry                        Iterations   Latency (ns/op)
---------------------------------------------------------------------------
CBIsOpen-16                                      33295966             42.33
CBRecordSuccess-16                               33752955             34.76
CBRecordFailure-16                               21240216             54.62
CBGetState-16                                    49082764             26.75
CBReset-16                                       42409119             27.92
CBConcurrentIsOpen-16                            10999486             118.5
CBConcurrentRecordSuccess-16                     10640410             116.2
CBConcurrentRecordFailure-16                      6743167             168.3
CBConcurrentMixed-16                              8100526             156.2
CBMultipleEndpoints-16                           33788730             36.96
CBStateTransitions-16                             1625580             783.0
CBConcurrentMultiEndpoints-16                     9498148             126.2
CBHighContention-16                                 28993             42299
CalculateBackoffExponential-16                    7979317             155.5
CalculateBackoffLinear-16                         9756136             107.5
CalculateBackoffConstant-16                      12302518             98.75
ShouldRetry-16                                 1000000000            0.2526
ExponentialBackoff-16                             6853519             168.9
LinearBackoff-16                                 12189670             98.93
ConstantBackoff-16                               11624571             99.04
CalculateBackoffVariousAttempts/1-16             11387002             105.7
CalculateBackoffVariousAttempts/3-16              8512702             141.4
CalculateBackoffVariousAttempts/5-16              7720368             144.7
CalculateBackoffVariousAttempts/10-16             8266329             146.6
CalculateBackoffVariousAttempts/20-16             6963606             172.2
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
