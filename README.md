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

Von charges for messages and throughput, nothing else. An event counts as one message, payloads over 64 KB add one message per extra 64 KB, and retries are always free. Throughput is the sustained events-per-second ceiling on each plan.

| Plan | Price | Messages | Overage | Throughput | Retention |
| --- | --- | --- | --- | --- | --- |
| Free | $0 | 50,000 | none, hard cap | 100/s | 3 days |
| Starter | $29 | 250,000 | $1.00 per 10k | 500/s | 7 days |
| Growth | $99 | 1,000,000 | $0.50 per 10k | 2,000/s | 14 days |
| Scale | $499 | 10,000,000 | $0.25 per 10k | 10,000/s | 30 days |
| Enterprise | Custom | Custom | Custom | Custom | Custom |

Every paid plan includes unlimited team members, transformations, replay, and all integrations, and self-hosting under AGPL-3.0 is free with no limits.

## Architecture

The delivery pipeline is Rust and the product surface is TypeScript.

| Service | Language | Responsibility |
| --- | --- | --- |
| `von-ingest` | Rust | Event ingest and the full HTTP API, per tenant coalescing, quota and throughput enforcement |
| `von-worker` | Rust | Persisting buffered events, outbound delivery with retries and circuit breaking, inbound forwarding |
| `apps/dashboard` | Next.js | Authentication, organizations, API key management, UI |

The dashboard issues API keys through better-auth and the Rust services verify them straight from Postgres and Redis, so the two sides share storage instead of code. Everything the SDK talks to is one Rust binary on one port, and schema migrations are embedded in the services and run on startup.

## Getting Started

Sending your first event takes four lines.

```typescript
import { Von } from "@usevon/sdk";

const von = new Von({ apiKey: "von_dev_xxx" });
await von.send("order.created", { orderId: 123 });
```

Events are deduplicated by idempotency key and acknowledged in about a millisecond. See [Delivery Semantics](#delivery-semantics) for the exact guarantees.

### Cloud

Get started at [usevon.com](https://usevon.com) with no setup required.

### Self-hosted

Self-hosting gives you the same product with your data on your own machines and no usage limits. The backend is two Rust binaries that run anywhere Linux runs, and the dashboard and site are Next.js apps that deploy to [Vercel](https://vercel.com) or any Node.js host.

You'll need Postgres and Redis to run it, Rust to build the binaries, and Bun for the JS apps. The backend wants a VPS rather than a serverless platform because the tunnel WebSockets are stateful.

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
cp .env.example .env
cp services/.env.example services/.env
cp apps/dashboard/.env.example apps/dashboard/.env
cp apps/docs/.env.example apps/docs/.env
cp apps/site/.env.example apps/site/.env

# Edit services/.env to set BETTER_AUTH_SECRET
# Optionally set API_KEY_SIGNING_SECRET
# SECRET_ENCRYPTION_KEY is required in production

# Start the JS apps
bun dev

# Start the Rust services in another terminal, migrations run on startup
cd services
cargo run -p von-ingest
cargo run -p von-worker
```

</details>

#### Production

**Frontend**

Deploy the dashboard and site to [Vercel](https://vercel.com) by importing your repo and setting the root directory to `apps/dashboard` or `apps/site`, then add your environment variables.

**Backend**

The backend is a Linux VPS with Postgres, Redis, and PM2 (`npm install -g pm2`). Build the two binaries and copy them up, replacing `user@server` with your SSH details.

```bash
cargo build --release --manifest-path services/Cargo.toml
scp services/target/release/von-ingest user@server:/app/
scp services/target/release/von-worker user@server:/app/
```

Then start them with PM2 and configure automatic startup.

```bash
pm2 start /app/von-ingest --name ingest
pm2 start /app/von-worker --name worker
pm2 save && pm2 startup
```

Both binaries read `DATABASE_URL`, `REDIS_URL`, `BETTER_AUTH_SECRET`, `API_KEY_SIGNING_SECRET`, and `SECRET_ENCRYPTION_KEY`, and the values must match the dashboard's since both sides read the same encrypted rows. Migrations run on startup, and `pm2 reload all` gives zero-downtime updates.

## Delivery Semantics

Every event is acknowledged after an atomic Redis quota check and stream write, then a background flusher persists it to Postgres within milliseconds. A Redis loss in that window can drop an acknowledged event.

Send an `idempotencyKey` to make that safe. Duplicate keys collapse to a single event on insert, so a retry after a timeout or a network failure can never create a second delivery. The SDK generates one per event by default, which is why `send` retries transient failures on your behalf.

## Testing

The Rust suites run against a live Postgres and Redis and skip cleanly when `DATABASE_URL` is unset.

```bash
# Rust services, unit plus integration
cd services && cargo test --workspace

# SDK and packages
bun run test
```

## Benchmarks

Three harnesses drive the compiled services over real HTTP. `loadgen` is a quick fixed-load check, `stress` sweeps payload size and concurrency and reports how many requests each Redis round trip absorbed, and `e2e` measures delivery latency all the way through the flusher and worker to a local sink, with `--json` output for CI.

```bash
docker compose -f docker-compose.dev.yml up -d
cd services
cargo run --release -p von-ingest --bin loadgen -- http://localhost:8090/webhooks <api-key> 2000 8
cargo run --release -p von-ingest --bin stress -- http://localhost:8090/webhooks <api-key> 20000
cargo run --release -p von-ingest --bin e2e -- http://localhost:8090/webhooks <api-key> 500
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

Von is dual licensed.

**AGPL-3.0 License** ([LICENSE-AGPL](LICENSE-AGPL))
- `services/` - the Rust backend
- `apps/` - dashboard, docs, site
- `packages/auth` - authentication
- `packages/db` - database schema
- `packages/email` - transactional emails
- `packages/queue` - queue definitions
- `packages/utils` - shared utilities

**MIT License** ([LICENSE-MIT](LICENSE-MIT))
- `packages/cli` - CLI
- `packages/react` - React hooks
- `packages/sdk` - TypeScript SDK
- `packages/types` - shared type definitions
- `packages/typescript-config` - shared TypeScript config
- `packages/ui` - UI components
