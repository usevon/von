# Von - Contributing

## Code Style

**Go (Backend)**
- Follow standard Go conventions and formatting
- Run `go fmt` before committing
- Use `golangci-lint` for linting
- Write tests for new features

**TypeScript (Frontend)**
- Use TypeScript with strict typing
- Follow kebab-case for file names
- Run `bun run lint` before committing
- Ensure all linting passes

## Development Setup

**Prerequisites**
- Go 1.23+
- Bun (for web packages)
- Docker and Docker Compose
- PostgreSQL 18
- RabbitMQ 4

**Getting Started**
```bash
# Clone the repository
git clone https://github.com/usevon/von.git
cd von

# Start infrastructure
docker-compose up -d

# Backend (Go)
go mod download
cd cmd/api && go run main.go

# Frontend (TypeScript)
cd web
bun install
bun run dev
```

## Pull Requests

- Keep changes focused and atomic
- Write clear commit messages using conventional format (feat:, fix:)
- Test your changes locally
- All linting must pass
- Update documentation if needed

## Commit Message Format

Use conventional commits:
- `feat(backend): add retry mechanism`
- `feat(frontend): add webhook dashboard`
- `fix(backend): correct signature validation`
- `docs: update installation guide`

## License

By contributing, you agree your code will be licensed under:
- **MIT License** for SDK packages (pkg/von, web/packages/*)
- **AGPL-3.0 License** for server components (cmd/, internal/, web/apps/)
