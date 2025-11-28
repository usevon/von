import { createFileRoute } from '@tanstack/react-router'
import { useSession } from '@/lib/auth/client'
import { api } from '@/lib/api'
import { useState } from 'react'
import { useInbound } from '@usevon/react/hooks'
import { Button } from '@von/ui'

export const Route = createFileRoute('/inbound')({
  component: InboundPage,
})

export default function InboundPage() {
  const { data } = useSession()
  const { session, user } = data ?? {}
  const { endpoints, isLoading, isConnected, error, refresh } = useInbound()
  const [name, setName] = useState('')
  const [provider, setProvider] = useState('')
  const [forwardUrl, setForwardUrl] = useState('https://example.com/inbound-webhook')
  const [actionLoading, setActionLoading] = useState(false)

  const createEndpoint = async () => {
    if (!user) {
      return
    }

    setActionLoading(true)

    const { data, error } = await api.inbound.post(
      {
        name: name || undefined,
        provider: provider || undefined,
        forwardUrl,
      },
      {
        fetch: { credentials: 'include' },
      }
    )

    setActionLoading(false)

    if (error) {
      console.error('Error creating inbound endpoint:', error)
      return
    }

    refresh()
  }

  const deleteEndpoint = async (id: string) => {
    if (!confirm('Are you sure you want to delete this inbound endpoint?')) return

    setActionLoading(true)

    const { data, error } = await api.inbound({ id }).delete(null, {
      fetch: { credentials: 'include' },
    })

    setActionLoading(false)

    if (error) {
      console.error('Error deleting inbound endpoint:', error)
      return
    }

    refresh()
  }

  if (!user) {
    return (
      <div className="p-5 font-mono">
        <h1 className="text-2xl font-bold mb-4">Inbound Endpoints</h1>
        <p className="text-gray-600">Please sign in to manage inbound endpoints.</p>
      </div>
    )
  }

  return (
    <div className="p-5 font-mono">
      <h1 className="text-2xl font-bold mb-4">Inbound Endpoints</h1>

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

      <div className="mb-5 p-4 border rounded">
        <h3 className="text-lg font-semibold mb-3">Create Inbound Endpoint</h3>
        <div className="mb-3">
          <label className="block text-sm font-medium mb-1">Name (optional)</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Stripe webhooks"
            className="w-full p-2 border rounded"
          />
        </div>
        <div className="mb-3">
          <label className="block text-sm font-medium mb-1">Provider (optional)</label>
          <input
            type="text"
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            placeholder="stripe, github, etc."
            className="w-full p-2 border rounded"
          />
        </div>
        <div className="mb-3">
          <label className="block text-sm font-medium mb-1">Forward URL</label>
          <input
            type="text"
            value={forwardUrl}
            onChange={(e) => setForwardUrl(e.target.value)}
            placeholder="https://example.com/inbound-webhook"
            className="w-full p-2 border rounded"
          />
          <p className="text-xs text-gray-600 mt-1">
            Where incoming webhooks will be forwarded to
          </p>
        </div>
        <Button onClick={createEndpoint} disabled={actionLoading || !forwardUrl}>
          Create Inbound Endpoint
        </Button>
      </div>

      <div className="mb-5">
        <Button onClick={refresh} disabled={isLoading} variant="secondary">
          {isLoading ? 'Loading...' : 'Refresh Endpoints'}
        </Button>
      </div>

      {error && (
        <div className="mb-5 p-4 bg-red-100 text-red-700 rounded">
          Error: {error.message}
        </div>
      )}

      <div className="p-4 border rounded">
        <h3 className="text-lg font-semibold mb-3">Inbound Endpoints ({endpoints.length})</h3>
        {endpoints.length === 0 ? (
          <p className="text-gray-500">No inbound endpoints yet. Create one to get started.</p>
        ) : (
          <div className="space-y-3">
            {endpoints.map((endpoint) => (
              <div key={endpoint.id} className="p-4 bg-gray-50 rounded border">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold">
                        {endpoint.name || 'Unnamed endpoint'}
                      </span>
                      {endpoint.provider && (
                        <span className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-800">
                          {endpoint.provider}
                        </span>
                      )}
                      <span
                        className={`px-2 py-1 text-xs rounded ${
                          endpoint.enabled
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {endpoint.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">Forwards to: {endpoint.forwardUrl}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => deleteEndpoint(endpoint.id)}
                      disabled={actionLoading}
                      variant="destructive"
                      size="sm"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
                <div className="bg-white p-3 rounded border mb-2">
                  <p className="text-xs font-medium text-gray-600 mb-1">Public Inbound URL:</p>
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded block">
                    {window.location.protocol}//{window.location.host}/in/{endpoint.id}
                  </code>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                  <div>
                    <span className="font-medium">ID:</span> {endpoint.id}
                  </div>
                  <div>
                    <span className="font-medium">Secret:</span> {endpoint.secret}
                  </div>
                  <div className="col-span-2">
                    <span className="font-medium">Created:</span>{' '}
                    {new Date(endpoint.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
