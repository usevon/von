# @usevon/api

REST API server for Von webhooks infrastructure, built with Elysia.

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

# CORS (comma-separated origins for production)
# CORS_ORIGINS=https://app.usevon.com
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /live | Liveness check |
| GET | /ready | Readiness check |
| | | |
| POST | /webhooks | Send a webhook |
| POST | /webhooks/batch | Send multiple webhooks |
| GET | /webhooks/events | List webhook events |
| GET | /webhooks/events/:id | Get a webhook event |
| | | |
| POST | /endpoints | Create an endpoint |
| GET | /endpoints | List endpoints |
| GET | /endpoints/:id | Get an endpoint |
| PATCH | /endpoints/:id | Update an endpoint |
| DELETE | /endpoints/:id | Delete an endpoint |
| | | |
| POST | /inbound | Create an inbound endpoint |
| GET | /inbound | List inbound endpoints |
| GET | /inbound/:id | Get an inbound endpoint |
| PATCH | /inbound/:id | Update an inbound endpoint |
| DELETE | /inbound/:id | Delete an inbound endpoint |
| POST | /in/:slug | Receive inbound webhook (public) |
| | | |
| POST | /versions | Create a version |
| GET | /versions | List versions |
| GET | /versions/:version | Get a version |
| PATCH | /versions/:version | Update a version |
| DELETE | /versions/:version | Delete a version |
| | | |
| * | /api/auth/* | better-auth endpoints |

## Authentication

API endpoints require authentication via API key or session cookie.

### API Key

```bash
curl -H "Authorization: Bearer von_prod_xxx" https://api.usevon.com/webhooks
```

### Session Cookie

Session-based auth is used by the dashboard. Cookies are set automatically by better-auth.

## License

AGPL-3.0 - see [LICENSE-AGPL](../../LICENSE-AGPL)
