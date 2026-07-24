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

## Getting Started

Sending your first event takes four lines.

```typescript
import { Von } from "@usevon/sdk";

const von = new Von({ apiKey: "von_dev_xxx" });
await von.send("order.created", { orderId: 123 });
```

Messages are acknowledged in a few milliseconds and deduplicated by an idempotency key the SDK generates per event, so a retried send can never create a second delivery. Get started at [usevon.com](https://usevon.com) with no setup required, or [self-host](#self-hosted) with your own infrastructure.

## Performance

Single node ingest measured at 100 concurrent clients, taking medians of repeated runs. Payloads under 1 KB perform the same as 1 KB because per message overhead dominates below that.

| Payload | Billed as | Messages/sec | MB/s | p50 (ms) | p99 (ms) |
| --- | --- | --- | --- | --- | --- |
| 1 KB | 1 message | **26,600** | 26 | 3.7 | 5.7 |
| 16 KB | 1 message | 15,200 | 238 | 6.4 | 10.4 |
| 64 KB | 1 message | 3,200 | 200 | 26.7 | 85 |
| 256 KB | 4 messages | 9,800 | 612 | 35.7 | 108 |
| 1 MB | 16 messages | 12,240 | **765** | 98 | 296 |

Peak throughput on one node is 37,200 messages per second at 500 concurrent clients. Concurrent messages coalesce into shared Redis round trips while large payloads are stored zstd compressed, and those two mechanisms together are what hold throughput up as payload size grows. The numbers are the same whether the load comes from one tenant or ten.

End to end, a message reaches its receiving endpoint in roughly 50 ms. Plan ceilings are enforced on the outbound side as well, so a capped tier queues instead of bursting past its limit.

See [Benchmarks](#benchmarks) to reproduce.

## Pricing

Von charges for messages and throughput, the sustained messages-per-second ceiling of each plan, and nothing else. An event counts as one message, each extra 64 KB of payload adds another, and retries are always free.

| Plan | Price | Messages | Overage | Throughput |
| --- | --- | --- | --- | --- |
| Free | $0 | 50,000 | none, hard cap | 200/s |
| Starter | $29 | 250,000 | $1.00 per 10k | 500/s |
| Growth | $99 | 1,000,000 | $0.50 per 10k | 1,000/s |
| Scale | $499 | 10,000,000 | $0.25 per 10k | 2,500/s |

Every plan keeps messages for up to 30 days. Paid plans include unlimited team members, transformations, replay, and all integrations, and self-hosting under AGPL-3.0 is free with no limits.

## Architecture

The delivery pipeline is Rust and the product surface is TypeScript.

| Service | Language | Responsibility |
| --- | --- | --- |
| `von-ingest` | Rust | Event ingest and the full HTTP API, per tenant coalescing, quota and throughput enforcement |
| `von-worker` | Rust | Persisting buffered events, outbound delivery with retries and circuit breaking, inbound forwarding |
| `apps/dashboard` | Next.js | Authentication, organizations, API key management, UI |

The dashboard issues API keys through better-auth and the Rust services verify them straight from Postgres and Redis, so the two sides share storage instead of code. Everything the SDK talks to is one Rust binary on one port. Schema migrations are embedded in the services and run on startup.

## Self-hosted

Self-hosting runs the same product on your own machines with your own data. The backend is two Rust binaries that run anywhere Linux runs, and the dashboard and site are Next.js apps that deploy to [Vercel](https://vercel.com) or any Node.js host. You'll need Postgres and Redis at runtime, plus Rust and Bun to build. The tunnel WebSockets are stateful, so the backend wants a VPS rather than a serverless platform.

<details>
<summary>Development setup</summary>

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

</details>

<details>
<summary>Production deployment</summary>

**Frontend**

Deploy the dashboard and site to [Vercel](https://vercel.com) by importing your repo and setting the root directory to `apps/dashboard` or `apps/site`, then add your environment variables.

**Backend**

Any Linux host with Postgres and Redis works. Build the two binaries, copy them up, and run each as a systemd service.

```bash
cargo build --release --manifest-path services/Cargo.toml
scp services/target/release/von-ingest services/target/release/von-worker user@server:/usr/local/bin/
```

```ini
# /etc/systemd/system/von-ingest.service, von-worker.service is identical
[Service]
ExecStart=/usr/local/bin/von-ingest
EnvironmentFile=/etc/von/env
Restart=always

[Install]
WantedBy=multi-user.target
```

Both binaries read `DATABASE_URL`, `REDIS_URL`, `BETTER_AUTH_SECRET`, `API_KEY_SIGNING_SECRET`, and `SECRET_ENCRYPTION_KEY` from that file, and the values must match the dashboard's because both sides read the same encrypted rows. Restarts are safe at any moment since claimed work is leased and re-polled rather than lost.

Give Redis enough `maxmemory` to buffer messages for as long as a worker outage might last, and compression makes that cheap, 2 GB holds roughly 14 GB of raw payload backlog. A full buffer returns retryable 503s and fails the readiness probe, nothing acknowledged is ever dropped, and the node recovers on its own once the worker drains. When upgrading, deploy `von-worker` before `von-ingest`.

</details>

## Testing

The Rust suites run against a live Postgres and Redis and skip cleanly when `DATABASE_URL` is unset.

```bash
# Rust services, unit plus integration
cd services && cargo test --workspace

# SDK and packages
bun run test
```

## Benchmarks

Start the dev stack, then one command runs three full passes and prints the medians the table above quotes.

```bash
docker compose -f docker-compose.dev.yml up -d
cd services
cargo run --release -p von-ingest --bin stress -- http://localhost:8090/webhooks <api-key> 20000
```

Numbers move with the machine, so treat them as relative rather than absolute.

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

## License

Von is dual licensed.

**AGPL-3.0 License** ([LICENSE-AGPL](LICENSE-AGPL))
- `services/` - the Rust backend
- `apps/` - dashboard, docs, site
- `packages/auth` - authentication
- `packages/db` - database schema
- `packages/email` - transactional emails
- `packages/queue` - redis helpers
- `packages/utils` - shared utilities

**MIT License** ([LICENSE-MIT](LICENSE-MIT))
- `packages/cli` - CLI
- `packages/react` - React hooks
- `packages/sdk` - TypeScript SDK
- `packages/types` - shared type definitions
- `packages/typescript-config` - shared TypeScript config
- `packages/ui` - UI components
