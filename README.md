# Von

<p align="center">
  <a href="https://bun.sh/"><img src="https://img.shields.io/badge/Bun-1.3+-black.svg" alt="Bun"></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5.7+-blue.svg" alt="TypeScript"></a>
  <a href="https://www.postgresql.org/"><img src="https://img.shields.io/badge/Postgres-18-blue.svg" alt="Postgres"></a>
  <a href="https://redis.io/"><img src="https://img.shields.io/badge/Redis-7-red.svg" alt="Redis"></a>
  <a href="LICENSE-MIT"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT"></a>
  <a href="LICENSE-AGPL"><img src="https://img.shields.io/badge/License-AGPL--3.0-blue.svg" alt="License: AGPL-3.0"></a>
</p>

Von is open-source webhooks infrastructure that handles delivery at scale. With Von, you get:

- Automatic retries with exponential backoff
- Circuit breakers for failing endpoints
- HMAC signature verification
- Environment isolation (dev, staging, prod, or custom)

All out of the box, without reinventing webhook infrastructure.

## SDKs

- **TypeScript** — [`@usevon/sdk`](packages/sdk)
- **React** — [`@usevon/react`](packages/react)

## Getting Started

**Cloud:** The quickest way to start is through [usevon.com](https://usevon.com)

**Self-hosted:**

```bash
git clone https://github.com/usevon/von.git
cd von
bun install

# Start infrastructure
docker compose -f docker-compose.dev.yml up -d

# Copy env files
cp apps/api/.env.example apps/api/.env
cp apps/worker/.env.example apps/worker/.env

# Push database schema
cd apps/api && bun run db:push

# Start the API and Worker (in separate terminals)
cd apps/api && bun run dev
cd apps/worker && bun run dev
```

## Testing

```bash
cd apps/api

# Run unit tests (no API key required)
bun test tests/unit

# Run integration tests (prompts for API key on first run, saves to OS keychain)
bun test tests/integration

# Run all tests
bun test
```


## Contributing

Von is open source and welcomes contributions, issues, and feedback.

See [CONTRIBUTING.md](.github/CONTRIBUTING.md) for development setup and guidelines.

## Security

For security concerns, see our [Security Policy](.github/SECURITY.md).

## License

Von uses dual licensing:

**AGPL-3.0 License** ([LICENSE-AGPL](LICENSE-AGPL))
- `apps/` - api, dashboard, site, tunnel, worker
- `packages/` - auth, db, env, logger, queue

**MIT License** ([LICENSE-MIT](LICENSE-MIT))
- `packages/cli/` - CLI
- `packages/sdk/` - TypeScript SDK
- `packages/tunnel/` - tunnel client
- `packages/react/` - React hooks
- `packages/ui/` - UI components
