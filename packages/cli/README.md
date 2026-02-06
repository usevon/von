# @usevon/cli

CLI for Von webhooks infrastructure. With the CLI, you get:

- Secure tunnels for local webhook testing
- Auto-reconnect with exponential backoff
- Up to 3 tunnels running simultaneously
- Automatic takeover when reconnecting to the same port
- Verbose mode for debugging requests

No ngrok setup, no manual forwarding.

## Installation

```bash
npm install -g @usevon/cli
```

## Quick Start

```bash
# Login to Von
von login

# Forward webhooks to localhost:3000
von dev -p 3000
```

## Commands

### `von login`

Authenticate with Von via device authorization flow.

```bash
von login                    # Hosted (api.usevon.com)
von login --local            # Local development (localhost:8080)
von login --api-url <url>    # Custom API URL
von login --force            # Re-authenticate even if logged in
```

### `von logout`

Log out and clear stored credentials.

```bash
von logout
```

### `von switch`

Switch active organization.

```bash
von switch
```

### `von dev`

Start dev tunnel for local webhook testing.

```bash
von dev -p 3000              # Single port
von dev -p 3000 -p 4000      # Multiple ports (max 3)
von dev -p 3000 -v           # Verbose mode (show headers/body)
```

### `von rotate`

Rotate tunnel secret to invalidate the current URL if compromised.

```bash
von rotate -p 3000           # Rotate secret for port 3000
```

If the tunnel is currently active, the CLI will display the new URL automatically.

## Configuration

Stored in `~/.von/config.json`:

```json
{
  "apiUrl": "https://api.usevon.com",
  "token": "...",
  "organizationId": "..."
}
```

## License

MIT - see [LICENSE-MIT](../../LICENSE-MIT)
