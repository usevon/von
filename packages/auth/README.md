# @usevon/auth

Authentication package for Von, built on better-auth with custom plugins.

## Installation

```bash
bun add @usevon/auth
```

## Server Setup

```typescript
import { createAuth } from '@usevon/auth'
import { db } from './db'
import { redis } from './redis'

export const auth = createAuth(db, {
  secret: process.env.AUTH_SECRET,
  baseURL: 'https://api.usevon.com',
  trustedOrigins: ['https://app.usevon.com'],
  secondaryStorage: {
    get: (key) => redis.get(key),
    set: (key, value, ttl) => redis.set(key, value, { ex: ttl }),
    delete: (key) => redis.del(key),
  },
})
```

## Client Setup

```typescript
import { createAuthClient } from '@usevon/auth/client'

export const authClient = createAuthClient({
  baseURL: 'https://api.usevon.com',
})

// Sign in
await authClient.signIn.email({
  email: 'user@example.com',
  password: 'password',
})

// Get session
const session = await authClient.getSession()
```

## API Keys

Create and verify API keys with environment prefixes and HMAC signing.

```typescript
apiKey({
  storage: 'secondary-storage',
  fallbackToDatabase: true,
  signingSecret: process.env.API_KEY_SIGNING_SECRET,
})
```

Key format:
- `von_dev_<random>.<signature>`
- `von_stg_<random>.<signature>`
- `von_prod_<random>.<signature>`

### Creating Keys

```typescript
const key = await authClient.apiKey.create({
  name: 'Production API Key',
  environment: 'prod',
  expiresIn: 60 * 60 * 24 * 30,
})

console.log(key.key)
```

### Verifying Keys (Server)

```typescript
const result = await auth.api.verifyApiKey({
  body: { key: 'von_prod_xxx.yyy' },
})

if (result.valid) {
  console.log(result.key.userId)
}
```

### Verifying Keys (Middleware)

```typescript
import { auth } from './auth'

app.use('/api', async (req, res, next) => {
  const apiKey = req.headers['x-api-key']
  if (!apiKey) return res.status(401).json({ error: 'Missing API key' })

  const result = await auth.api.verifyApiKey({
    body: { key: apiKey },
  })

  if (!result.valid) return res.status(401).json({ error: result.error.message })

  req.apiKey = result.key
  next()
})
```

## License

MIT - see [LICENSE-MIT](../../LICENSE-MIT)
