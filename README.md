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
- Environment isolation (dev, staging, prod)
- Local testing with tunnels via the [CLI](#cli)

All out of the box, without reinventing webhook infrastructure.

## Getting Started

### Cloud

Get started at [usevon.com](https://usevon.com) with no setup required.

### Self-hosted

Self-hosting Von gives you full control over your data with no usage limits, and the backend services compile to standalone binaries that you can run with PM2 for zero-downtime reloads.

The backend (api, worker) requires a VPS or dedicated server since stateful WebSocket connections aren't compatible with serverless platforms. The dashboard and site are Next.js apps that can be deployed to [Vercel](https://vercel.com) or self-hosted anywhere that runs Node.js.

You'll need PostgreSQL, Redis, and Bun installed for building.

#### Development

```bash
git clone https://github.com/usevon/von.git
cd von
bun install
bun setup
bun dev
```

<details>
<summary>Manual setup (without the setup script)</summary>

```bash
# Start infrastructure
docker compose -f docker-compose.dev.yml up -d

# Copy env files
cp apps/api/.env.example apps/api/.env
cp apps/dashboard/.env.example apps/dashboard/.env
cp apps/worker/.env.example apps/worker/.env
cp apps/docs/.env.example apps/docs/.env
cp apps/site/.env.example apps/site/.env

# Edit .env files to set BETTER_AUTH_SECRET and API_KEY_SIGNING_SECRET

# Push database schema
bun run --cwd apps/api db:push

# Start all services
bun dev
```

</details>

#### Production

**Frontend**

Deploy the dashboard and site to [Vercel](https://vercel.com) by importing your repo and setting the root directory to `apps/dashboard` or `apps/site`, then add your environment variables.

**Backend**

The backend services require a Linux VPS with PostgreSQL and Redis, and PM2 for process management (`npm install -g pm2`). Build the binaries locally and deploy them to your server:

```bash
bun run --cwd apps/api build:prod
bun run --cwd apps/worker build:prod
```

Copy the binaries to your server (replace `user@server` with your SSH details):

```bash
scp apps/api/dist/api user@server:/app/
scp apps/worker/dist/worker user@server:/app/
```

Then start them with PM2 and configure automatic startup:

```bash
pm2 start /app/api --name api
pm2 start /app/worker --name worker
pm2 save && pm2 startup
```

For zero-downtime reloads after updates, run `pm2 reload all`.

## Testing

```bash
# Unit tests (from root)
bun run test

# Package-specific tests
bun test --cwd packages/sdk
bun test --cwd apps/worker

# Integration tests (requires env vars)
cd apps/api && bun test tests/integration
```

## SDKs

| Language | Package |
| --- | --- |
| TypeScript | [`@usevon/sdk`](packages/sdk) |
| React | [`@usevon/react`](packages/react) |

## CLI

Install the CLI globally to test webhooks locally with tunnels:

```bash
npm install -g @usevon/cli
```

## Contributing

Von is open source and welcomes contributions, issues, and feedback.

See [CONTRIBUTING.md](.github/CONTRIBUTING.md) for development setup and guidelines.

## Security

For security concerns, see our [Security Policy](.github/SECURITY.md).

## License

Von uses dual licensing:

**AGPL-3.0 License** ([LICENSE-AGPL](LICENSE-AGPL))
- `apps/` - api, dashboard, docs, site, worker
- `packages/auth` - authentication
- `packages/db` - database schema
- `packages/email` - transactional emails
- `packages/queue` - job queue
- `packages/utils` - shared utilities

**MIT License** ([LICENSE-MIT](LICENSE-MIT))
- `packages/cli` - CLI
- `packages/react` - React hooks
- `packages/sdk` - TypeScript SDK
- `packages/types` - shared type definitions
- `packages/typescript-config` - shared TypeScript config
- `packages/ui` - UI components
