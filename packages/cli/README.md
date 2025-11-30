# @usevon/cli

Command-line interface for Von webhooks infrastructure.

## Installation

```bash
npm install -g @usevon/cli
```

## Usage

### Authentication

```bash
# Login to Von (opens browser for device authorization)
von login

# Login with local development server
von login --local

# Login with custom API URL
von login --api-url http://localhost:8080

# Logout
von logout

# Switch organization
von switch
```

### Development Tunnel

Forward webhooks to your local development server:

```bash
# Start tunnel on port 3000
von dev -p 3000

# Start tunnel with specific organization
von dev -p 3000 --org <org-id>
```

### Commands

| Command | Description |
|---------|-------------|
| `von login` | Authenticate with Von |
| `von logout` | Log out of Von |
| `von switch` | Switch active organization |
| `von dev -p <port>` | Start dev tunnel for local webhook testing |

### Options

**Global**
- `-v, --version` - Show version number
- `-h, --help` - Show help

**login**
- `-l, --local` - Use local development URLs (localhost:8080)
- `--api-url <url>` - Custom API URL
- `--tunnel-url <url>` - Custom tunnel URL

**dev**
- `-p, --port <port>` - Local port to forward to (required)
- `-o, --org <orgId>` - Organization ID (uses active org if not specified)

## Configuration

Configuration is stored in `~/.von/config.json`:

```json
{
  "apiUrl": "https://api.usevon.com",
  "tunnelUrl": "https://dev.usevon.com",
  "token": "...",
  "organizationId": "..."
}
```

## License

MIT
