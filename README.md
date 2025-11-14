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
