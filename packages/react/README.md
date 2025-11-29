# @usevon/react

React hooks and provider for Von webhook management.

## Installation

```bash
bun add @usevon/react
```

## Setup

```tsx
import { VonProvider } from "@usevon/react"

// API key auth (SDK users)
<VonProvider apiUrl="https://api.usevon.com" apiKey="von_live_xxx">
  <App />
</VonProvider>

// Session cookie auth (dashboard)
<VonProvider apiUrl="/api" useSession>
  <App />
</VonProvider>
```

## Hooks

### useEndpoints

```tsx
const { endpoints, isLoading, isRefreshing, error, refresh, mutate } = useEndpoints()
```

### useInbound

```tsx
const { endpoints, isLoading, isRefreshing, error, refresh, mutate } = useInbound()
```

### useWebhooks

```tsx
const { events, isLoading, isRefreshing, error, refresh, mutate } = useWebhooks()
```

## Example

```tsx
import { useEndpoints } from "@usevon/react/hooks"

const EndpointList = () => {
  const { endpoints, isLoading, isRefreshing, refresh, mutate } = useEndpoints()

  const toggle = async (id: string, enabled: boolean) => {
    mutate(
      endpoints.map(e => e.id === id ? { ...e, enabled: !enabled } : e),
      { revalidate: false }
    )
    await api.endpoints({ id }).patch({ enabled: !enabled })
    mutate()
  }

  if (isLoading) return <div>Loading...</div>

  return (
    <div>
      {endpoints.map(endpoint => (
        <div key={endpoint.id}>
          <span>{endpoint.url}</span>
          <button onClick={() => toggle(endpoint.id, endpoint.enabled)}>
            {endpoint.enabled ? "Disable" : "Enable"}
          </button>
        </div>
      ))}
      <button onClick={refresh} disabled={isRefreshing}>
        {isRefreshing ? "Refreshing..." : "Refresh"}
      </button>
    </div>
  )
}
```
