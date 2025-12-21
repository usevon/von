"use client";

import { useWebhooks } from "@usevon/react/hooks";
import {
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
import { Building2, Webhook } from "lucide-react";
import { CreateOrganizationDialog } from "@/components/create-organization-dialog";
import { SendWebhookDialog } from "@/components/send-webhook-dialog";
import { useSession } from "@/lib/auth/client";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  completed: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
};

export default function WebhooksPage() {
  const { data } = useSession();
  const { session, user } = data ?? {};
  const { events, isLoading, isRefreshing, error, refresh } = useWebhooks();

  const isDisabled = !(user && session?.activeOrganizationId);

  const renderContent = () => {
    if (!user) {
      return (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Webhook className="size-4.5" />
            </EmptyMedia>
            <EmptyTitle>Sign in required</EmptyTitle>
            <EmptyDescription>
              Please sign in to view webhook events.
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
              Create an organization to start sending webhooks.
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
            <EmptyTitle>Loading webhook events...</EmptyTitle>
            <EmptyDescription>
              Fetching your recent webhook activity.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button disabled>Send Test</Button>
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

    if (events.length === 0) {
      return (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Webhook className="size-4.5" />
            </EmptyMedia>
            <EmptyTitle>No webhook events</EmptyTitle>
            <EmptyDescription>
              Send a test webhook or use the API to get started.
            </EmptyDescription>
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
              <div className="mb-2 flex items-start justify-between">
                <span className="font-semibold">{event.eventType}</span>
                <span
                  className={`rounded px-2 py-1 text-xs ${statusColors[event.status] ?? statusColors.failed}`}
                >
                  {event.status}
                </span>
              </div>
              <p className="mb-2 text-muted-foreground text-xs">
                ID: {event.id}
              </p>
              <pre className="overflow-auto rounded bg-muted p-2 text-xs">
                {JSON.stringify(event.payload, null, 2)}
              </pre>
              <p className="mt-2 text-muted-foreground text-xs">
                {new Date(event.createdAt).toLocaleString()}
              </p>
            </CardPanel>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-bold text-2xl">Webhook Events</h1>
        <div className="flex gap-2">
          <SendWebhookDialog
            disabled={isLoading || isDisabled}
            onSent={refresh}
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
    </>
  );
}
