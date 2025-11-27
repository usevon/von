import { createFileRoute } from '@tanstack/react-router'
import { useSession } from '@/lib/auth/client'
import { api } from '@/lib/api'
import { useState, useEffect } from 'react'

export const Route = createFileRoute('/inbound')({
  component: InboundPage,
})

type InboundEndpoint = {
  id: string
  name: string | null
  provider: string | null
  secret: string
  forwardUrl: string
  enabled: boolean
  createdAt: string
  updatedAt: string
}

export default function InboundPage() {
  const { data: session } = useSession()
  const [endpoints, setEndpoints] = useState<InboundEndpoint[]>([])
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')
  const [provider, setProvider] = useState('')
  const [forwardUrl, setForwardUrl] = useState('https://example.com/inbound-webhook')

  useEffect(() => {
    if (session?.user) {
      loadEndpoints()
    }
  }, [session])

  const loadEndpoints = async () => {
    if (!session?.user) {
      return
    }

    setLoading(true)

    const { data, error } = await api.inbound.get({
      fetch: { credentials: 'include' },
    })

    setLoading(false)

    if (error) {
      console.error('Error loading inbound endpoints:', error)
      return
    }

    setEndpoints(data.endpoints)
  }

  const createEndpoint = async () => {
    if (!session?.user) {
      return
    }

    setLoading(true)

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

    setLoading(false)

    if (error) {
      console.error('Error creating inbound endpoint:', error)
      return
    }

    loadEndpoints()
  }

  const deleteEndpoint = async (id: string) => {
    if (!confirm('Are you sure you want to delete this inbound endpoint?')) return

    setLoading(true)

    const { data, error } = await api.inbound({ id }).delete(null, {
      fetch: { credentials: 'include' },
    })

    setLoading(false)

    if (error) {
      console.error('Error deleting inbound endpoint:', error)
      return
    }

    loadEndpoints()
  }

  if (!session?.user) {
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
          Session: {session ? 'Authenticated' : 'Not authenticated'}
        </h3>
        <p className="text-sm text-gray-600 mb-2">
          Active Org ID: {session?.session?.activeOrganizationId || 'None'}
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
        <button
          onClick={createEndpoint}
          disabled={loading || !forwardUrl}
          className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          Create Inbound Endpoint
        </button>
      </div>

      <div className="mb-5">
        <button
          onClick={loadEndpoints}
          disabled={loading}
          className="p-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {loading ? 'Loading...' : 'Refresh Endpoints'}
        </button>
      </div>

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
                    <button
                      onClick={() => deleteEndpoint(endpoint.id)}
                      disabled={loading}
                      className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 disabled:bg-gray-400"
                    >
                      Delete
                    </button>
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
