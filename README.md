# Von

<p align="center">
  <a href="https://www.rust-lang.org/"><img src="https://img.shields.io/badge/Rust-1.97+-orange.svg" alt="Rust"></a>
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

## Performance

Ingest throughput on a single node, measured with the stress harness against Redis and Postgres.

| Payload | Requests/sec | p50 | Sustained |
| --- | --- | --- | --- |
| Tiny | **30,000+** | 1.1 ms | — |
| 1 KB | 9,400 | 8.0 ms | 9 MB/s |
| 16 KB | 2,350 | 30.8 ms | 37 MB/s |
| 64 KB | 640 | 77.0 ms | 40 MB/s |

Concurrent requests from one tenant are coalesced into a single Redis operation, so cost per event falls as traffic rises. At 200 concurrent clients, 1,000 requests cost 22 round trips instead of 1,000.

See [Benchmarks](#benchmarks) to reproduce.

## Pricing

Von charges for the two things that actually cost money to run, and nothing else.

**Messages.** Every event you send counts as one message, and payloads over 64 KB count as one additional message per 64 KB. Retries are always free, because a partner's broken endpoint is the problem Von exists to absorb, not something to bill you for.

**Throughput.** Each plan has a sustained events-per-second ceiling. It is a property of the plan, never a metered add-on.

| Plan | Price | Messages | Overage | Throughput | Retention |
| --- | --- | --- | --- | --- | --- |
| Free | $0 | 50,000 | none, hard cap | 100/s | 3 days |
| Starter | $29 | 250,000 | $1.00 per 10k | 500/s | 7 days |
| Growth | $99 | 1,000,000 | $0.50 per 10k | 2,000/s | 14 days |
| Scale | $499 | 10,000,000 | $0.25 per 10k | 10,000/s | 30 days |
| Enterprise | Custom | Custom | Custom | Custom | Custom |

Every paid plan includes unlimited team members, transformations, replay, and all integrations. Self-hosting is free and unlimited under AGPL-3.0.

## Architecture

The data plane is Rust and the control plane is TypeScript.

| Service | Language | Responsibility |
| --- | --- | --- |
| `von-ingest` | Rust | Event ingest, per tenant coalescing, quota and throughput enforcement, endpoint CRUD |
| `apps/api` | Bun | Remaining control plane routes, being ported to Rust module by module |
| `apps/worker` | Bun | Outbound delivery, retries, circuit breaking |
| `apps/dashboard` | Next.js | Authentication, organizations, API key management, UI |

Both API services read the same Postgres and Redis, so a reverse proxy can route each path to whichever one owns it. Secrets and pagination cursors are byte compatible across the two, which is what makes moving a route a routing change rather than a migration.

```
Caddyfile
localhost:8000 {
  handle /webhooks* { reverse_proxy localhost:8090 }
  handle /endpoints* { reverse_proxy localhost:8090 }
  handle { reverse_proxy localhost:8080 }
}
```

## Getting Started

Sending your first event takes four lines.

```typescript
import { Von } from "@usevon/sdk";

const von = new Von({ apiKey: "von_dev_xxx" });
await von.send("order.created", { orderId: 123 });
```

Events are durable and exactly-once by default. See [Delivery Semantics](#delivery-semantics) for the faster buffered mode.

### Cloud

Get started at [usevon.com](https://usevon.com) with no setup required.

### Self-hosted

Self-hosting Von gives you full control over your data with no usage limits, and the backend services compile to standalone binaries that you can run with PM2 for zero-downtime reloads.

The backend requires a VPS or dedicated server since stateful WebSocket connections aren't compatible with serverless platforms. The dashboard and site are Next.js apps that can be deployed to [Vercel](https://vercel.com) or self-hosted anywhere that runs Node.js.

You'll need PostgreSQL, Redis, Bun, and Rust installed for building.

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

# Edit apps/api/.env to set BETTER_AUTH_SECRET
# Optionally set API_KEY_SIGNING_SECRET
# SECRET_ENCRYPTION_KEY is required in production

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
cargo build --release --manifest-path ../von-rust/Cargo.toml
bun run --cwd apps/api build:prod
bun run --cwd apps/worker build:prod
```

Copy the binaries to your server (replace `user@server` with your SSH details):

```bash
scp ../von-rust/target/release/von-ingest user@server:/app/
scp apps/api/dist/api user@server:/app/
scp apps/worker/dist/worker user@server:/app/
```

Then start them with PM2 and configure automatic startup:

```bash
pm2 start /app/von-ingest --name ingest
pm2 start /app/api --name api
pm2 start /app/worker --name worker
pm2 save && pm2 startup
```

The ingest service needs `DATABASE_URL`, `REDIS_URL`, `BETTER_AUTH_SECRET`, and `API_KEY_SIGNING_SECRET` to match the values the API uses, since both read the same encrypted rows.

For zero-downtime reloads after updates, run `pm2 reload all`.

## Delivery Semantics

Every event is acknowledged after an atomic Redis quota check and stream write, then a background flusher persists it to Postgres within milliseconds. A Redis loss in that window can drop an acknowledged event.

Send an `idempotencyKey` to make that safe. Duplicate keys collapse to a single event on insert, so a retry after a timeout or a network failure can never create a second delivery. The SDK generates one per event by default, which is why `send` retries transient failures on your behalf.

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

## Benchmarks

```bash
docker compose -f docker-compose.dev.yml up -d
cd apps/api && bun run bench
```

Runs an in-process benchmark against every hot endpoint with warmup plus 50 measured iterations per case and prints throughput with p50 and p95 latency. Webhook ingest numbers reflect the buffered fast path with the flusher active, so they include the rate limiter and quota reservation but not outbound delivery.

The stress harness drives the ingest service over HTTP and sweeps both payload size and concurrency, reporting throughput, latency percentiles, and how many requests each Redis round trip absorbed.

```bash
stress http://localhost:8090/webhooks <api-key> 20000
```

Numbers move with the machine, so treat any run under ten seconds as noise and take medians across at least three runs.

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
