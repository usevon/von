import { createFileRoute } from '@tanstack/react-router'
import { useSession } from '@/lib/auth/client'
import { api } from '@/lib/api'
import { useState, useEffect } from 'react'

export const Route = createFileRoute('/webhooks')({
  component: WebhooksPage,
})

type WebhookEvent = {
  id: string
  eventType: string
  payload: unknown
  status: string
  createdAt: string
}

export default function WebhooksPage() {
  const { data: session } = useSession()
  const [events, setEvents] = useState<WebhookEvent[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (session?.user) {
      loadEvents()
    }
  }, [session])

  const loadEvents = async () => {
    if (!session?.user) {
      return
    }

    setLoading(true)

    const { data, error } = await api.webhooks.events.get({
      query: { limit: 50, offset: 0 },
      fetch: { credentials: 'include' },
    })

    setLoading(false)

    if (error) {
      console.error('Error loading events:', error)
      return
    }

    setEvents(data.events)
  }

  if (!session?.user) {
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
          Session: {session ? 'Authenticated' : 'Not authenticated'}
        </h3>
        <p className="text-sm text-gray-600 mb-2">
          Active Org ID: {session?.session?.activeOrganizationId || 'None'}
        </p>
      </div>

      <div className="mb-5">
        <button
          onClick={loadEvents}
          disabled={loading}
          className="p-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {loading ? 'Loading...' : 'Refresh Events'}
        </button>
      </div>

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
