import { createFileRoute } from '@tanstack/react-router'
import { useSession } from '@/lib/auth/client'
import { api } from '@/lib/api'
import { useState } from 'react'
import { useEndpoints } from '@usevon/react/hooks'
import { Globe, Building2 } from 'lucide-react'
import { CreateEndpointDialog } from '@/components/create-endpoint-dialog'
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogPopup,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogClose,
  Button,
  Card,
  CardPanel,
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
  Spinner,
} from '@von/ui'

export const Route = createFileRoute('/endpoints')({
  component: EndpointsPage,
})

export default function EndpointsPage() {
  const { data } = useSession()
  const { session, user } = data ?? {}
  const { endpoints, isLoading, error, refresh } = useEndpoints()
  const [loadingEndpointId, setLoadingEndpointId] = useState<string | null>(null)

  const toggleEndpoint = async (id: string, currentEnabled: boolean) => {
    setLoadingEndpointId(id)

    const { error } = await api.endpoints({ id }).patch(
      { enabled: !currentEnabled },
      { fetch: { credentials: 'include' } }
    )

    setLoadingEndpointId(null)

    if (error) {
      console.error('Error toggling endpoint:', error)
      return
    }

    refresh()
  }

  const deleteEndpoint = async (id: string) => {
    setLoadingEndpointId(id)

    const { error } = await api.endpoints({ id }).delete(null, {
      fetch: { credentials: 'include' },
    })

    setLoadingEndpointId(null)

    if (error) {
      console.error('Error deleting endpoint:', error)
      return
    }

    refresh()
  }

  const isDisabled = !user || !session?.activeOrganizationId

  const renderContent = () => {
    if (!user) {
      return (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Globe className="size-4.5" />
            </EmptyMedia>
            <EmptyTitle>Sign in required</EmptyTitle>
            <EmptyDescription>Please sign in to manage endpoints.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )
    }

    if (!session?.activeOrganizationId) {
      return (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Building2 className="size-4.5" />
            </EmptyMedia>
            <EmptyTitle>No organization</EmptyTitle>
            <EmptyDescription>Create an organization to manage endpoints.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button>Create Organization</Button>
          </EmptyContent>
        </Empty>
      )
    }

    if (isLoading) {
      return (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Spinner className="size-4.5" />
            </EmptyMedia>
            <EmptyTitle>Loading endpoints...</EmptyTitle>
          </EmptyHeader>
        </Empty>
      )
    }

    if (error) {
      return (
        <div className="p-4 bg-red-100 text-red-700 rounded">
          Error: {error.message}
        </div>
      )
    }

    if (endpoints.length === 0) {
      return (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Globe className="size-4.5" />
            </EmptyMedia>
            <EmptyTitle>No endpoints</EmptyTitle>
            <EmptyDescription>Create an endpoint to get started.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <CreateEndpointDialog onCreated={refresh} />
          </EmptyContent>
        </Empty>
      )
    }

    return (
      <div className="space-y-4">
        {endpoints.map((endpoint) => (
          <Card key={endpoint.id}>
            <CardPanel>
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-semibold">{endpoint.url}</span>
                    <span
                      className={`px-2 py-1 text-xs rounded ${endpoint.enabled
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                        }`}
                    >
                      {endpoint.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  {endpoint.description && (
                    <p className="text-sm text-muted-foreground">{endpoint.description}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => toggleEndpoint(endpoint.id, endpoint.enabled)}
                    disabled={loadingEndpointId === endpoint.id}
                    variant="outline"
                    size="sm"
                  >
                    {loadingEndpointId === endpoint.id ? '...' : endpoint.enabled ? 'Disable' : 'Enable'}
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger render={<Button variant="destructive" size="sm" disabled={loadingEndpointId === endpoint.id} />}>
                      Delete
                    </AlertDialogTrigger>
                    <AlertDialogPopup>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Endpoint</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete this endpoint? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogClose render={<Button variant="outline" />}>
                          Cancel
                        </AlertDialogClose>
                        <Button variant="destructive" onClick={() => deleteEndpoint(endpoint.id)}>
                          {loadingEndpointId === endpoint.id ? 'Deleting...' : 'Delete'}
                        </Button>
                      </AlertDialogFooter>
                    </AlertDialogPopup>
                  </AlertDialog>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
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
            </CardPanel>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Webhook Endpoints</h1>
        <div className="flex gap-2">
          <CreateEndpointDialog onCreated={refresh} disabled={isDisabled} />
          <Button onClick={refresh} disabled={isLoading || isDisabled} variant="secondary">
            Refresh
          </Button>
        </div>
      </div>
      {renderContent()}
    </div>
  )
}
