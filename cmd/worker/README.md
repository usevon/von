# Von - Worker Server

<p align="center">
  <a href="https://golang.org/"><img src="https://img.shields.io/badge/Go-1.24+-blue.svg" alt="Go"></a>
  <a href="../../LICENSE-AGPL"><img src="https://img.shields.io/badge/License-AGPL--3.0-blue.svg" alt="License: AGPL-3.0"></a>
</p>

Worker server for processing and delivering webhooks from RabbitMQ queue.

## Running

```bash
go run main.go
```

Connects to RabbitMQ and processes webhook delivery jobs.

## Environment Variables

- `DATABASE_URL` - PostgreSQL connection string
- `RABBITMQ_URL` - RabbitMQ connection string
- `WORKER_TIMEOUT` - HTTP request timeout in seconds (default: 30)

## Features

- Automatic retries with exponential backoff
- Circuit breaker to prevent cascading failures
- HMAC signature verification (SHA256/SHA512)
- Poison queue monitoring for permanently failed messages
- Per-endpoint health score tracking

## License

AGPL-3.0 - see [LICENSE-AGPL](../../LICENSE-AGPL)
