# Security Policy

## Reporting a Vulnerability

If you believe you've found a security vulnerability, please follow these steps:

1. **Do not disclose the vulnerability publicly** until it has been addressed by our team
2. **Email your findings to kgrahammatzen@gmail.com** or use GitHub's [private vulnerability reporting](https://github.com/usevon/von/security)

Include:
- A description of the vulnerability
- Steps to reproduce the vulnerability
- Potential impact of the vulnerability
- Any suggestions for mitigation
- Any other relevant information

We will respond as soon as we are notified of your report.

## Disclosure Policy

If the issue is confirmed, we will release a patch as soon as possible. Once a patch is released, we will disclose the issue publicly. If 90 days has elapsed and we still don't have a fix, we will disclose the issue publicly.

## Supported Versions

We only support the latest version of Von. Older versions are not supported.

## Security Measures

### Authentication

- API keys with environment prefixes (`von_dev_`, `von_stg_`, `von_prod_`)
- HMAC-SHA256 signed keys with timing-safe verification
- SHA256 hashed storage (keys never retrievable)
- Session-based auth with better-auth

### Webhook Security

- HMAC-SHA256 signatures on all deliveries
- Timestamp validation (5-minute replay window)
- SSRF protection (private IP/hostname blocklist)
- Circuit breaker pattern for endpoint reliability

### Data Protection

- Organization-scoped data access
- Parameterized queries (Drizzle ORM)
- No raw SQL

### Infrastructure

- Security headers (HSTS, X-Frame-Options, X-Content-Type-Options)
- Rate limiting (IP + user-based via Redis)
- Redis-backed idempotency with database constraints
