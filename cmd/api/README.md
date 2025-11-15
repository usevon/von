# Von - API Server

<p align="center">
  <a href="https://golang.org/"><img src="https://img.shields.io/badge/Go-1.24+-blue.svg" alt="Go"></a>
    <a href="../../LICENSE-AGPL"><img src="https://img.shields.io/badge/License-AGPL--3.0-blue.svg" alt="License: AGPL-3.0"></a>
</p>

HTTP API server for Von webhooks infrastructure.

## Running

```bash
go run main.go
```

Runs on port 3000 (configurable via `PORT` env var).

## Environment Variables

- `PORT` - HTTP server port (default: 3000)
- `DATABASE_URL` - PostgreSQL connection string
- `RABBITMQ_URL` - RabbitMQ connection string

## Endpoints

- `GET /health` - Health check
- `POST /v1/events` - Create event and fan out to matching endpoints
- `GET /v1/endpoints` - List endpoints for an application
- `POST /v1/endpoints` - Create new endpoint
- `GET /v1/endpoints/:id` - Get endpoint details
- `PUT /v1/endpoints/:id` - Update endpoint
- `DELETE /v1/endpoints/:id` - Delete endpoint
- `GET /v1/deliveries` - List deliveries with filters
- `GET /v1/deliveries/:id` - Get delivery details
- `GET /v1/deliveries/:id/attempts` - Get delivery attempts
- `POST /v1/deliveries/:id/retry` - Manually retry failed delivery

## License

AGPL-3.0 - see [LICENSE-AGPL](../../LICENSE-AGPL)
