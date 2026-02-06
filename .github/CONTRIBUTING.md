# Von - Contributing

## Development Setup

**Prerequisites**
- Bun 1.3.2+
- Docker and Docker Compose

**Getting Started**
```bash
git clone https://github.com/usevon/von.git
cd von
bun install
bun setup
bun dev
```

**Running Tests**
```bash
cd apps/api

# Unit tests (no setup required)
bun test tests/unit

# Integration tests (prompts for API key on first run)
bun test tests/integration
```

## Pull Requests

- Keep changes focused and atomic
- Write clear commit messages using conventional format
- Test your changes locally

## Commit Message Format

- `feat(backend): add retry mechanism`
- `feat(frontend): add webhook dashboard`
- `fix(backend): correct signature validation`

## License

By contributing, you agree your code will be licensed under:
- **MIT License** for SDK packages (packages/sdk, packages/react)
- **AGPL-3.0 License** for server components (apps/*)
