import { createFileRoute } from '@tanstack/react-router'
import { useSession } from '@/lib/auth/client'
import { api } from '@/lib/api'
import { useState, useEffect } from 'react'

export const Route = createFileRoute('/endpoints')({
  component: EndpointsPage,
})

type Endpoint = {
  id: string
  url: string
  description: string | null
  secret: string
  enabled: boolean
  retryCount: number
  timeoutMs: number
  createdAt: string
  updatedAt: string
}

export default function EndpointsPage() {
  const { data: session } = useSession()
  const [endpoints, setEndpoints] = useState<Endpoint[]>([])
  const [loading, setLoading] = useState(false)
  const [url, setUrl] = useState('https://example.com/webhook')
  const [description, setDescription] = useState('')

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

    const { data, error } = await api.endpoints.get({
      fetch: { credentials: 'include' },
    })

    setLoading(false)

    if (error) {
      console.error('Error loading endpoints:', error)
      return
    }

    setEndpoints(data.endpoints)
  }

  const createEndpoint = async () => {
    if (!session?.user) {
      return
    }

    setLoading(true)

    const { data, error } = await api.endpoints.post(
      {
        url,
        description: description || undefined,
      },
      {
        fetch: { credentials: 'include' },
      }
    )

    setLoading(false)

    if (error) {
      console.error('Error creating endpoint:', error)
      return
    }

    loadEndpoints()
  }

  const toggleEndpoint = async (id: string, currentEnabled: boolean) => {
    setLoading(true)

    const { data, error } = await api.endpoints({ id }).patch(
      { enabled: !currentEnabled },
      {
        fetch: { credentials: 'include' },
      }
    )

    setLoading(false)

    if (error) {
      console.error('Error toggling endpoint:', error)
      return
    }

    loadEndpoints()
  }

  const deleteEndpoint = async (id: string) => {
    if (!confirm('Are you sure you want to delete this endpoint?')) return

    setLoading(true)

    const { data, error } = await api.endpoints({ id }).delete(null, {
      fetch: { credentials: 'include' },
    })

    setLoading(false)

    if (error) {
      console.error('Error deleting endpoint:', error)
      return
    }

    loadEndpoints()
  }

  if (!session?.user) {
    return (
      <div className="p-5 font-mono">
        <h1 className="text-2xl font-bold mb-4">Webhook Endpoints</h1>
        <p className="text-gray-600">Please sign in to manage endpoints.</p>
      </div>
    )
  }

  return (
    <div className="p-5 font-mono">
      <h1 className="text-2xl font-bold mb-4">Webhook Endpoints</h1>

      <div className="mb-5 p-4 bg-gray-100 rounded">
        <h3 className="text-lg font-semibold mb-2">
          Session: {session ? 'Authenticated' : 'Not authenticated'}
        </h3>
        <p className="text-sm text-gray-600 mb-2">
          Active Org ID: {session?.session?.activeOrganizationId || 'None'}
        </p>
      </div>

      <div className="mb-5 p-4 border rounded">
        <h3 className="text-lg font-semibold mb-3">Create Endpoint</h3>
        <div className="mb-3">
          <label className="block text-sm font-medium mb-1">URL</label>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/webhook"
            className="w-full p-2 border rounded"
          />
        </div>
        <div className="mb-3">
          <label className="block text-sm font-medium mb-1">Description (optional)</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Production webhook"
            className="w-full p-2 border rounded"
          />
        </div>
        <button
          onClick={createEndpoint}
          disabled={loading || !url}
          className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          Create Endpoint
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
        <h3 className="text-lg font-semibold mb-3">Endpoints ({endpoints.length})</h3>
        {endpoints.length === 0 ? (
          <p className="text-gray-500">No endpoints yet. Create one to get started.</p>
        ) : (
          <div className="space-y-3">
            {endpoints.map((endpoint) => (
              <div key={endpoint.id} className="p-4 bg-gray-50 rounded border">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold">{endpoint.url}</span>
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
                    {endpoint.description && (
                      <p className="text-sm text-gray-600">{endpoint.description}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleEndpoint(endpoint.id, endpoint.enabled)}
                      disabled={loading}
                      className="px-3 py-1 text-sm bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:bg-gray-400"
                    >
                      {endpoint.enabled ? 'Disable' : 'Enable'}
                    </button>
                    <button
                      onClick={() => deleteEndpoint(endpoint.id)}
                      disabled={loading}
                      className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 disabled:bg-gray-400"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                  <div>
                    <span className="font-medium">ID:</span> {endpoint.id}
                  </div>
                  <div>
                    <span className="font-medium">Secret:</span> {endpoint.secret}
                  </div>
                  <div>
                    <span className="font-medium">Retries:</span> {endpoint.retryCount}
                  </div>
                  <div>
                    <span className="font-medium">Timeout:</span> {endpoint.timeoutMs}ms
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
