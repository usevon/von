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

- **TypeScript** - [`@usevon/sdk`](packages/sdk) ([npm](https://www.npmjs.com/package/@usevon/sdk))
- **React** - [`@usevon/react`](packages/react) ([npm](https://www.npmjs.com/package/@usevon/react))

## CLI

```bash
npm install -g @usevon/cli
```

[`@usevon/cli`](packages/cli) ([npm](https://www.npmjs.com/package/@usevon/cli)) - local webhook testing with tunnels

## Getting Started

### Cloud

The quickest way to start is through [usevon.com](https://usevon.com)

### Self-hosted

Run Von on your own infrastructure. With self-hosted, you get:

- Standalone binaries for api, tunnel, and worker (no Bun needed on server)
- PM2 process management with zero-downtime reloads
- Full control over your data and deployment
- No usage limits or rate limiting

Backend services require a VPS or dedicated server (stateful WebSocket connections aren't compatible with serverless platforms like Cloudflare Workers), but frontend can be deployed anywhere.

Requires PostgreSQL, Redis, and Bun (for building).

#### Development

```bash
git clone https://github.com/usevon/von.git
cd von
bun install

# Start infrastructure
docker compose -f docker-compose.dev.yml up -d

# Copy env files
cp apps/api/.env.example apps/api/.env
cp apps/worker/.env.example apps/worker/.env
cp apps/tunnel/.env.example apps/tunnel/.env

# Push database schema
bun run --cwd apps/api db:push

# Start all services
bun dev
```

#### Production

Deploy to a Linux VPS with PM2 for process management.

**Prerequisites:** Linux VPS, [Bun](https://bun.sh), PostgreSQL, Redis, PM2 (`npm install -g pm2`)

**Build:**

```bash
# Backend (standalone binaries)
bun run --cwd apps/api build:prod
bun run --cwd apps/tunnel build:prod
bun run --cwd apps/worker build:prod

# Frontend
bun run --cwd apps/dashboard build
bun run --cwd apps/site build
```

**Deploy** (replace `user@server` with your SSH user and server address):

```bash
# Backend binaries
scp apps/api/dist/api user@server:/app/
scp apps/tunnel/dist/tunnel user@server:/app/
scp apps/worker/dist/worker user@server:/app/

# Dashboard
rsync -av apps/dashboard/.output/ user@server:/app/dashboard/

# Site
rsync -av apps/site/dist/ user@server:/app/site/
```

**Start with PM2:**

```bash
pm2 start /app/api --name api
pm2 start /app/tunnel --name tunnel
pm2 start /app/worker --name worker
pm2 start "bun /app/dashboard/server/index.mjs" --name dashboard
pm2 start "bun --bun vite preview --port 3000" --name site --cwd /app/site
pm2 save && pm2 startup
```

**Zero-downtime reload:** `pm2 reload all`

## Testing

```bash
# Unit tests (from root)
bun run test

# Package-specific tests
bun test --cwd packages/sdk
bun test --cwd apps/worker

# Integration tests (requires env vars)
cd apps/api && bun test tests/integration
cd apps/tunnel && bun test tests/integration
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
