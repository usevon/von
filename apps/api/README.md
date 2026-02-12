# @usevon/api

REST API server for Von webhooks infrastructure, built with Elysia. Endpoints require authentication via API key (`Authorization: Bearer von_prod_xxx`) or session cookie.

## Running Locally

```bash
# Install dependencies
bun install

# Start development server
bun dev

# Build for production
bun run build

# Start production server
bun start
```

## Environment Variables

Copy the templates before running locally or in tests:

```bash
cp .env.example .env
cp .env.test.example .env.test
```

```bash
# Database
DATABASE_URL=postgres://von:von_dev_password@localhost:5432/von_dev

# Redis
REDIS_URL=redis://localhost:6379

# Server
PORT=8080
NODE_ENV=development

# Better Auth
BETTER_AUTH_SECRET=your-secret-key-min-32-characters-long
BETTER_AUTH_URL=http://localhost:8080
# Optional dedicated encryption key for webhook/inbound/tunnel secrets at rest
# SECRET_ENCRYPTION_KEY=your-secret-encryption-key

# Dashboard
DASHBOARD_URL=http://localhost:3001

# CORS (comma-separated origins for production)
# CORS_ORIGINS=https://app.usevon.com

# API key HMAC signing (enables API key auth when set)
# API_KEY_SIGNING_SECRET=your-api-key-signing-secret

# OAuth (optional)
# GOOGLE_CLIENT_ID=...
# GOOGLE_CLIENT_SECRET=...
# GITHUB_CLIENT_ID=...
# GITHUB_CLIENT_SECRET=...

# Tunnels
MAX_TUNNELS_PER_ORG=3

# Webhooks
WEBHOOK_BATCH_MAX_EVENTS=100

# Email (optional)
# RESEND_API_KEY=...
EMAIL_FROM=Von <noreply@usevon.com>
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| **Health** | | |
| GET | / | Service info |
| GET | /live | Liveness check |
| GET | /ready | Readiness check (DB + Redis) |
| **Auth** | | |
| * | /api/auth/* | better-auth endpoints |
| **Webhooks** | | |
| POST | /webhooks | Send a webhook |
| POST | /webhooks/batch | Send multiple webhooks |
| GET | /webhooks/events | List webhook events |
| GET | /webhooks/events/:id | Get a webhook event |
| GET | /webhooks/events/:id/deliveries | List deliveries for an event |
| POST | /webhooks/events/:id/replay | Replay a webhook event |
| POST | /webhooks/events/replay | Bulk replay events |
| **Endpoints** | | |
| POST | /endpoints | Create an endpoint |
| GET | /endpoints | List endpoints |
| GET | /endpoints/:id | Get an endpoint |
| PATCH | /endpoints/:id | Update an endpoint |
| DELETE | /endpoints/:id | Delete an endpoint |
| POST | /endpoints/:id/test | Test an endpoint |
| POST | /endpoints/:id/rotate | Rotate endpoint secret |
| DELETE | /endpoints/:id/previous-secret | Clear previous secret |
| **Inbound** | | |
| POST | /inbound | Create an inbound endpoint |
| GET | /inbound | List inbound endpoints |
| GET | /inbound/:id | Get an inbound endpoint |
| PATCH | /inbound/:id | Update an inbound endpoint |
| DELETE | /inbound/:id | Delete an inbound endpoint |
| POST | /in/:slug | Receive inbound webhook (public) |
| **Versions** | | |
| POST | /versions | Create a version |
| GET | /versions | List versions |
| GET | /versions/:version | Get a version |
| PATCH | /versions/:version | Update a version |
| DELETE | /versions/:version | Delete a version |
| **Tunnels** | | |
| POST | /register | Register a tunnel |
| POST | /rotate/:tunnelId | Rotate tunnel secret |
| GET | /tunnels | List active tunnels |
| WS | /ws/:tunnelId | Tunnel WebSocket connection |
| * | /t/:tunnelId/* | Tunnel proxy (public) |

## License

AGPL-3.0 - see [LICENSE-AGPL](../../LICENSE-AGPL)
