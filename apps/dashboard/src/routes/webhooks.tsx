import { createFileRoute } from '@tanstack/react-router'
import { useSession } from '@/lib/auth/client'
import { useWebhooks } from '@usevon/react/hooks'
import { Button } from '@von/ui'

export const Route = createFileRoute('/webhooks')({
  component: WebhooksPage,
})

export default function WebhooksPage() {
  const { data } = useSession()
  const { session, user } = data ?? {}
  const { events, isLoading, isConnected, error, refresh } = useWebhooks()

  if (!user) {
    return (
      <div className="p-5 font-mono">
        <h1 className="text-2xl font-bold mb-4">Webhooks</h1>
        <p className="text-gray-600">Please sign in to view webhook events.</p>
      </div>
    )
  }

  return (
    <div className="p-5 font-mono">
      <h1 className="text-2xl font-bold mb-4">Webhook Events</h1>

      <div className="mb-5 p-4 bg-gray-100 rounded">
        <h3 className="text-lg font-semibold mb-2">
          Session: {data ? 'Authenticated' : 'Not authenticated'}
        </h3>
        <p className="text-sm text-gray-600 mb-2">
          Active Org ID: {session?.activeOrganizationId || 'None'}
        </p>
        <p className="text-sm text-gray-600">
          WebSocket: <span className={isConnected ? 'text-green-600' : 'text-red-600'}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </p>
      </div>

      <div className="mb-5">
        <Button onClick={refresh} disabled={isLoading} variant="secondary">
          {isLoading ? 'Loading...' : 'Refresh Events'}
        </Button>
      </div>

      {error && (
        <div className="mb-5 p-4 bg-red-100 text-red-700 rounded">
          Error: {error.message}
        </div>
      )}

      <div className="p-4 border rounded">
        <h3 className="text-lg font-semibold mb-3">Webhook Events ({events.length})</h3>
        {events.length === 0 ? (
          <p className="text-gray-500">No events yet. Send a webhook via the API to see it here.</p>
        ) : (
          <div className="space-y-2">
            {events.map((event) => (
              <div key={event.id} className="p-3 bg-gray-50 rounded border">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-semibold">{event.eventType}</span>
                  <span
                    className={`px-2 py-1 text-xs rounded ${
                      event.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : event.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {event.status}
                  </span>
                </div>
                <p className="text-xs text-gray-600 mb-2">ID: {event.id}</p>
                <pre className="text-xs bg-white p-2 rounded overflow-auto">
                  {JSON.stringify(event.payload, null, 2)}
                </pre>
                <p className="text-xs text-gray-500 mt-2">
                  {new Date(event.createdAt).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
