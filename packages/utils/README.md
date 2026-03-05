# @usevon/utils

Shared utilities for Von's backend services.

## Modules

Each module is available as a sub-path import:

```typescript
import { hmacSign, buildSignatureHeader } from "@usevon/utils/crypto"
import { NotFoundError, BadRequestError } from "@usevon/utils/errors"
import { isCircuitOpen, getFailureUpdate } from "@usevon/utils/circuit-breaker"
import { generateSecret } from "@usevon/utils/ids"
import { applyTransforms } from "@usevon/utils/transforms"
import { createLogger } from "@usevon/utils/logger"
```

### crypto

Cryptographic primitives for webhook signing: HMAC-SHA256, timing-safe comparison, and signature header construction with secret rotation support.

### errors

HTTP error classes (400, 401, 403, 404, 429, 500) with consistent `.status` and `.toResponse()` interfaces.

### circuit-breaker

Pure-functional circuit breaker state machine. Returns state patches instead of mutating, so consumers own the storage (database, memory, etc.).

### ids

ID and secret generation for endpoints, tunnels, and API keys.

### transforms

Declarative payload transformation engine for webhook versioning. Supports field renaming, removal, and defaults.

### logger

Pino-based structured logger with automatic redaction of sensitive fields (tokens, passwords, secrets).

## Testing

```bash
bun test
```

## License

AGPL-3.0 - see [LICENSE-AGPL](../../LICENSE-AGPL)
