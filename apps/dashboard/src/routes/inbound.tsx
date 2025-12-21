import { createFileRoute } from "@tanstack/react-router";
import { useInbound } from "@usevon/react/hooks";
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
import { Building2, Download } from "lucide-react";
import { CreateInboundDialog } from "@/components/create-inbound-dialog";
import { CreateOrganizationDialog } from "@/components/create-organization-dialog";
import { api } from "@/lib/api";
import { useSession } from "@/lib/auth/client";

export const Route = createFileRoute("/inbound")({
  component: InboundPage,
});

export default function InboundPage() {
  const { data } = useSession();
  const { session, user } = data ?? {};
  const { endpoints, isLoading, isRefreshing, error, refresh, mutate } =
    useInbound();

  const toggleEndpoint = async (id: string, currentEnabled: boolean) => {
    mutate(
      endpoints.map((e) =>
        e.id === id ? { ...e, enabled: !currentEnabled } : e
      ),
      { revalidate: false }
    );

    const { error: toggleError } = await api
      .inbound({ id })
      .patch(
        { enabled: !currentEnabled },
        { fetch: { credentials: "include" } }
      );

    if (toggleError) {
      console.error("Error toggling inbound endpoint:", toggleError);
    }

    mutate();
  };

  const deleteEndpoint = async (id: string) => {
    mutate(
      endpoints.filter((e) => e.id !== id),
      { revalidate: false }
    );

    const { error: deleteError } = await api.inbound({ id }).delete(null, {
      fetch: { credentials: "include" },
    });

    if (deleteError) {
      console.error("Error deleting inbound endpoint:", deleteError);
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
              <Download className="size-4.5" />
            </EmptyMedia>
            <EmptyTitle>Sign in required</EmptyTitle>
            <EmptyDescription>
              Please sign in to manage inbound endpoints.
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
              Create an organization to manage inbound endpoints.
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
            <EmptyTitle>Loading inbound endpoints...</EmptyTitle>
            <EmptyDescription>
              Fetching your inbound endpoints.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button disabled>Create Inbound Endpoint</Button>
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
              <Download className="size-4.5" />
            </EmptyMedia>
            <EmptyTitle>No inbound endpoints</EmptyTitle>
            <EmptyDescription>
              Create an inbound endpoint to get started.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <CreateInboundDialog onCreated={refresh} />
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
                    <span className="font-semibold">
                      {endpoint.name || "Unnamed endpoint"}
                    </span>
                    {endpoint.provider ? (
                      <span className="rounded bg-blue-100 px-2 py-1 text-blue-800 text-xs">
                        {endpoint.provider}
                      </span>
                    ) : null}
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
                  <p className="text-muted-foreground text-sm">
                    Forwards to: {endpoint.forwardUrl}
                  </p>
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
                        <AlertDialogTitle>
                          Delete Inbound Endpoint
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete this inbound endpoint?
                          This action cannot be undone.
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
              <div className="mb-4 rounded bg-muted p-4">
                <p className="mb-2 font-medium text-muted-foreground text-xs">
                  Public Inbound URL:
                </p>
                <code className="block rounded bg-background px-2 py-1 text-xs">
                  {window.location.origin}/in/{endpoint.id}
                </code>
              </div>
              <div className="grid grid-cols-2 gap-2 text-muted-foreground text-xs">
                <div>
                  <span className="font-medium">ID:</span> {endpoint.id}
                </div>
                <div>
                  <span className="font-medium">Secret:</span> {endpoint.secret}
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
        <h1 className="font-bold text-2xl">Inbound Endpoints</h1>
        <div className="flex gap-2">
          <CreateInboundDialog
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
