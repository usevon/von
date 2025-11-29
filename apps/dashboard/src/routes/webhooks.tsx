import { createFileRoute } from "@tanstack/react-router";
import { useSession } from "@/lib/auth/client";
import { useWebhooks } from "@usevon/react/hooks";
import { Webhook, Building2 } from "lucide-react";
import { SendWebhookDialog } from "@/components/send-webhook-dialog";
import {
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
} from "@usevon/ui";

export const Route = createFileRoute("/webhooks")({
  component: WebhooksPage,
});

export default function WebhooksPage() {
  const { data } = useSession();
  const { session, user } = data ?? {};
  const { events, isLoading, isRefreshing, error, refresh } = useWebhooks();

  const isDisabled = !user || !session?.activeOrganizationId;

  const renderContent = () => {
    if (!user) {
      return (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Webhook className="size-4.5" />
            </EmptyMedia>
            <EmptyTitle>Sign in required</EmptyTitle>
            <EmptyDescription>Please sign in to view webhook events.</EmptyDescription>
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
            <EmptyDescription>Create an organization to start sending webhooks.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button>Create Organization</Button>
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
            <EmptyTitle>Loading webhook events...</EmptyTitle>
            <EmptyDescription>Fetching your recent webhook activity.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button disabled>Send Test</Button>
          </EmptyContent>
        </Empty>
      );
    }

    if (error) {
      return (
        <div className="p-4 bg-red-100 text-red-700 rounded">
          Error: {error.message}
        </div>
      );
    }

    if (events.length === 0) {
      return (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Webhook className="size-4.5" />
            </EmptyMedia>
            <EmptyTitle>No webhook events</EmptyTitle>
            <EmptyDescription>Send a test webhook or use the API to get started.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <SendWebhookDialog onSent={refresh} />
          </EmptyContent>
        </Empty>
      );
    }

    return (
      <div className="space-y-4">
        {events.map((event) => (
          <Card key={event.id}>
            <CardPanel>
              <div className="flex justify-between items-start mb-2">
                <span className="font-semibold">{event.eventType}</span>
                <span
                  className={`px-2 py-1 text-xs rounded ${event.status === "pending"
                    ? "bg-yellow-100 text-yellow-800"
                    : event.status === "completed"
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                    }`}
                >
                  {event.status}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mb-2">ID: {event.id}</p>
              <pre className="text-xs bg-muted p-2 rounded overflow-auto">
                {JSON.stringify(event.payload, null, 2)}
              </pre>
              <p className="text-xs text-muted-foreground mt-2">
                {new Date(event.createdAt).toLocaleString()}
              </p>
            </CardPanel>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Webhook Events</h1>
        <div className="flex gap-2">
          <SendWebhookDialog disabled={isLoading || isDisabled} onSent={refresh} />
          <Button onClick={refresh} disabled={isLoading || isRefreshing || isDisabled} variant="secondary">
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
      </div>
      {renderContent()}
    </div>
  );
}
