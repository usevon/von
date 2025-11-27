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
  const [apiKey, setApiKey] = useState('')
  const [eventType, setEventType] = useState('user.created')
  const [payload, setPayload] = useState('{"userId": "123", "email": "test@example.com"}')
  const [log, setLog] = useState<string[]>([])

  const addLog = (message: string) => {
    setLog((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`])
  }

  const loadEvents = async () => {
    if (!apiKey) {
      addLog('Error: API key required')
      return
    }

    setLoading(true)
    addLog('Fetching webhook events...')

    const { data, error } = await api.webhooks.events.get({
      headers: { authorization: `Bearer ${apiKey}` },
      query: { limit: 50, offset: 0 },
    })

    setLoading(false)

    if (error) {
      addLog(`Error: ${error.status} - ${JSON.stringify(error.value)}`)
      return
    }

    setEvents(data.events)
    addLog(`Loaded ${data.events.length} events`)
  }

  const sendWebhook = async () => {
    if (!apiKey) {
      addLog('Error: API key required')
      return
    }

    let parsedPayload
    try {
      parsedPayload = JSON.parse(payload)
    } catch (e) {
      addLog('Error: Invalid JSON payload')
      return
    }

    setLoading(true)
    addLog(`Sending webhook: ${eventType}`)

    const { data, error } = await api.webhooks.post(
      {
        eventType,
        payload: parsedPayload,
      },
      {
        headers: { authorization: `Bearer ${apiKey}` },
      }
    )

    setLoading(false)

    if (error) {
      switch (error.status) {
        case 401:
          addLog('Error: Invalid API key')
          break
        case 400:
          addLog(`Error: Invalid request - ${JSON.stringify(error.value)}`)
          break
        default:
          addLog(`Error: ${error.status} - ${JSON.stringify(error.value)}`)
      }
      return
    }

    addLog(`Webhook sent! ID: ${data.id}`)
    loadEvents()
  }

  return (
    <div className="p-5 font-mono">
      <h1 className="text-2xl font-bold mb-4">Webhooks</h1>

      <div className="mb-5 p-4 bg-gray-100 rounded">
        <h3 className="text-lg font-semibold mb-2">
          Session: {session ? 'Authenticated' : 'Not authenticated'}
        </h3>
        <p className="text-sm text-gray-600 mb-2">
          Active Org ID: {session?.session?.activeOrganizationId || 'None'}
        </p>
      </div>

      <div className="mb-5 p-4 border rounded">
        <h3 className="text-lg font-semibold mb-3">API Configuration</h3>
        <div className="mb-3">
          <label className="block text-sm font-medium mb-1">API Key</label>
          <input
            type="text"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="von_dev_..."
            className="w-full p-2 border rounded font-mono text-sm"
          />
          <p className="text-xs text-gray-600 mt-1">
            Get this from the test-auth page by creating an API key
          </p>
        </div>
      </div>

      <div className="mb-5 p-4 border rounded">
        <h3 className="text-lg font-semibold mb-3">Send Webhook</h3>
        <div className="mb-3">
          <label className="block text-sm font-medium mb-1">Event Type</label>
          <input
            type="text"
            value={eventType}
            onChange={(e) => setEventType(e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>
        <div className="mb-3">
          <label className="block text-sm font-medium mb-1">Payload (JSON)</label>
          <textarea
            value={payload}
            onChange={(e) => setPayload(e.target.value)}
            rows={4}
            className="w-full p-2 border rounded font-mono text-sm"
          />
        </div>
        <button
          onClick={sendWebhook}
          disabled={loading || !apiKey}
          className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          Send Webhook
        </button>
      </div>

      <div className="mb-5">
        <button
          onClick={loadEvents}
          disabled={loading || !apiKey}
          className="p-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed mr-2"
        >
          {loading ? 'Loading...' : 'Refresh Events'}
        </button>
        <button
          onClick={() => setLog([])}
          className="p-2 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          Clear Log
        </button>
      </div>

      <div className="mb-5 bg-black text-green-400 p-4 min-h-[12.5rem] overflow-auto rounded border border-gray-700">
        <h3 className="text-white text-lg font-semibold mb-3">Log Output</h3>
        {log.map((entry, i) => (
          <pre key={i} className="my-1 whitespace-pre-wrap text-xs">
            {entry}
          </pre>
        ))}
      </div>

      <div className="p-4 border rounded">
        <h3 className="text-lg font-semibold mb-3">Webhook Events ({events.length})</h3>
        {events.length === 0 ? (
          <p className="text-gray-500">No events yet. Send a webhook to see it here.</p>
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
