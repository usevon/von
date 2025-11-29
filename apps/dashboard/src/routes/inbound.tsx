import { createFileRoute } from '@tanstack/react-router'
import { useSession } from '@/lib/auth/client'
import { api } from '@/lib/api'
import { useInbound } from '@usevon/react/hooks'
import { Download, Building2 } from 'lucide-react'
import { CreateInboundDialog } from '@/components/create-inbound-dialog'
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
} from '@usevon/ui'

export const Route = createFileRoute('/inbound')({
  component: InboundPage,
})

export default function InboundPage() {
  const { data } = useSession()
  const { session, user } = data ?? {}
  const { endpoints, isLoading, isRefreshing, error, refresh, mutate } = useInbound()

  const toggleEndpoint = async (id: string, currentEnabled: boolean) => {
    mutate(
      endpoints.map(e => e.id === id ? { ...e, enabled: !currentEnabled } : e),
      { revalidate: false }
    )

    const { error } = await api.inbound({ id }).patch(
      { enabled: !currentEnabled },
      { fetch: { credentials: 'include' } }
    )

    if (error) {
      console.error('Error toggling inbound endpoint:', error)
    }

    mutate()
  }

  const deleteEndpoint = async (id: string) => {
    mutate(
      endpoints.filter(e => e.id !== id),
      { revalidate: false }
    )

    const { error } = await api.inbound({ id }).delete(null, {
      fetch: { credentials: 'include' },
    })

    if (error) {
      console.error('Error deleting inbound endpoint:', error)
    }

    mutate()
  }

  const isDisabled = !user || !session?.activeOrganizationId

  const renderContent = () => {
    if (!user) {
      return (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Download className="size-4.5" />
            </EmptyMedia>
            <EmptyTitle>Sign in required</EmptyTitle>
            <EmptyDescription>Please sign in to manage inbound endpoints.</EmptyDescription>
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
            <EmptyDescription>Create an organization to manage inbound endpoints.</EmptyDescription>
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
            <EmptyTitle>Loading inbound endpoints...</EmptyTitle>
            <EmptyDescription>Fetching your inbound endpoints.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button disabled>Create Inbound Endpoint</Button>
          </EmptyContent>
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
              <Download className="size-4.5" />
            </EmptyMedia>
            <EmptyTitle>No inbound endpoints</EmptyTitle>
            <EmptyDescription>Create an inbound endpoint to get started.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <CreateInboundDialog onCreated={refresh} />
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
                    <span className="font-semibold">
                      {endpoint.name || 'Unnamed endpoint'}
                    </span>
                    {endpoint.provider && (
                      <span className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-800">
                        {endpoint.provider}
                      </span>
                    )}
                    <span
                      className={`px-2 py-1 text-xs rounded ${endpoint.enabled
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                        }`}
                    >
                      {endpoint.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">Forwards to: {endpoint.forwardUrl}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => toggleEndpoint(endpoint.id, endpoint.enabled)}
                    variant="outline"
                    size="sm"
                  >
                    {endpoint.enabled ? 'Disable' : 'Enable'}
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger render={<Button variant="destructive" size="sm" />}>
                      Delete
                    </AlertDialogTrigger>
                    <AlertDialogPopup>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Inbound Endpoint</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete this inbound endpoint? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogClose render={<Button variant="outline" />}>
                          Cancel
                        </AlertDialogClose>
                        <Button variant="destructive" onClick={() => deleteEndpoint(endpoint.id)}>
                          Delete
                        </Button>
                      </AlertDialogFooter>
                    </AlertDialogPopup>
                  </AlertDialog>
                </div>
              </div>
              <div className="bg-muted p-4 rounded mb-4">
                <p className="text-xs font-medium text-muted-foreground mb-2">Public Inbound URL:</p>
                <code className="text-xs bg-background px-2 py-1 rounded block">
                  {window.location.protocol}//{window.location.host}/in/{endpoint.id}
                </code>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
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
            </CardPanel>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Inbound Endpoints</h1>
        <div className="flex gap-2">
          <CreateInboundDialog onCreated={refresh} disabled={isLoading || isDisabled} />
          <Button onClick={refresh} disabled={isLoading || isRefreshing || isDisabled} variant="secondary">
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
      </div>
      {renderContent()}
    </div>
  )
}
