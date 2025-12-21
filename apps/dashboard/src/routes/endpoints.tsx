import { createFileRoute } from "@tanstack/react-router";
import { useEndpoints } from "@usevon/react/hooks";
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
  AlertDialogTrigger,
  Button,
  Card,
  CardPanel,
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  Spinner,
} from "@usevon/ui";
import { Building2, Globe } from "lucide-react";
import { CreateEndpointDialog } from "@/components/create-endpoint-dialog";
import { CreateOrganizationDialog } from "@/components/create-organization-dialog";
import { api } from "@/lib/api";
import { useSession } from "@/lib/auth/client";

export const Route = createFileRoute("/endpoints")({
  component: EndpointsPage,
});

export default function EndpointsPage() {
  const { data } = useSession();
  const { session, user } = data ?? {};
  const { endpoints, isLoading, isRefreshing, error, refresh, mutate } =
    useEndpoints();

  const toggleEndpoint = async (id: string, currentEnabled: boolean) => {
    mutate(
      endpoints.map((e) =>
        e.id === id ? { ...e, enabled: !currentEnabled } : e
      ),
      { revalidate: false }
    );

    const { error: toggleError } = await api
      .endpoints({ id })
      .patch(
        { enabled: !currentEnabled },
        { fetch: { credentials: "include" } }
      );

    if (toggleError) {
      console.error("Error toggling endpoint:", toggleError);
    }

    mutate();
  };

  const deleteEndpoint = async (id: string) => {
    mutate(
      endpoints.filter((e) => e.id !== id),
      { revalidate: false }
    );

    const { error: deleteError } = await api.endpoints({ id }).delete(null, {
      fetch: { credentials: "include" },
    });

    if (deleteError) {
      console.error("Error deleting endpoint:", deleteError);
    }

    mutate();
  };

  const isDisabled = !(user && session?.activeOrganizationId);

  const renderContent = () => {
    if (!user) {
      return (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Globe className="size-4.5" />
            </EmptyMedia>
            <EmptyTitle>Sign in required</EmptyTitle>
            <EmptyDescription>
              Please sign in to manage endpoints.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      );
    }

    if (!session?.activeOrganizationId) {
      return (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Building2 className="size-4.5" />
            </EmptyMedia>
            <EmptyTitle>No organization</EmptyTitle>
            <EmptyDescription>
              Create an organization to manage endpoints.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <CreateOrganizationDialog onCreated={refresh} />
          </EmptyContent>
        </Empty>
      );
    }

    if (isLoading) {
      return (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Spinner className="size-4.5" />
            </EmptyMedia>
            <EmptyTitle>Loading endpoints...</EmptyTitle>
            <EmptyDescription>
              Fetching your webhook endpoints.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button disabled>Create Endpoint</Button>
          </EmptyContent>
        </Empty>
      );
    }

    if (error) {
      return (
        <div className="rounded bg-red-100 p-4 text-red-700">
          Error: {error.message}
        </div>
      );
    }

    if (endpoints.length === 0) {
      return (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Globe className="size-4.5" />
            </EmptyMedia>
            <EmptyTitle>No endpoints</EmptyTitle>
            <EmptyDescription>
              Create an endpoint to get started.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <CreateEndpointDialog onCreated={refresh} />
          </EmptyContent>
        </Empty>
      );
    }

    return (
      <div className="space-y-4">
        {endpoints.map((endpoint) => (
          <Card key={endpoint.id}>
            <CardPanel>
              <div className="mb-4 flex items-start justify-between">
                <div className="flex-1">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="font-semibold">{endpoint.url}</span>
                    <span
                      className={`rounded px-2 py-1 text-xs ${
                        endpoint.enabled
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {endpoint.enabled ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                  {endpoint.description ? (
                    <p className="text-muted-foreground text-sm">
                      {endpoint.description}
                    </p>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() =>
                      toggleEndpoint(endpoint.id, endpoint.enabled)
                    }
                    size="sm"
                    variant="outline"
                  >
                    {endpoint.enabled ? "Disable" : "Enable"}
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger
                      render={<Button size="sm" variant="destructive" />}
                    >
                      Delete
                    </AlertDialogTrigger>
                    <AlertDialogPopup>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Endpoint</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete this endpoint? This
                          action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogClose render={<Button variant="outline" />}>
                          Cancel
                        </AlertDialogClose>
                        <Button
                          onClick={() => deleteEndpoint(endpoint.id)}
                          variant="destructive"
                        >
                          Delete
                        </Button>
                      </AlertDialogFooter>
                    </AlertDialogPopup>
                  </AlertDialog>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-muted-foreground text-xs">
                <div>
                  <span className="font-medium">ID:</span> {endpoint.id}
                </div>
                <div>
                  <span className="font-medium">Secret:</span> {endpoint.secret}
                </div>
                <div>
                  <span className="font-medium">Retries:</span>{" "}
                  {endpoint.retryCount}
                </div>
                <div>
                  <span className="font-medium">Timeout:</span>{" "}
                  {endpoint.timeoutMs}ms
                </div>
                <div className="col-span-2">
                  <span className="font-medium">Created:</span>{" "}
                  {new Date(endpoint.createdAt).toLocaleString()}
                </div>
              </div>
            </CardPanel>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-bold text-2xl">Webhook Endpoints</h1>
        <div className="flex gap-2">
          <CreateEndpointDialog
            disabled={isLoading || isDisabled}
            onCreated={refresh}
          />
          <Button
            disabled={isLoading || isRefreshing || isDisabled}
            onClick={refresh}
            variant="secondary"
          >
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
      </div>
      {renderContent()}
    </div>
  );
}
