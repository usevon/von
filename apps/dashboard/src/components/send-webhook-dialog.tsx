import { useEndpoints } from "@usevon/react/hooks";
import {
  Button,
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
  DialogTrigger,
  Field,
  FieldDescription,
  FieldLabel,
  Form,
  Input,
  Select,
  SelectItem as SelectItemType,
  SelectPopup,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@usevon/ui";
import { useState } from "react";
import { api } from "@/lib/api";

type SendWebhookDialogProps = {
  onSent: () => void;
  disabled?: boolean;
};

type SelectItem = {
  label: string;
  value: string | null;
};

export const SendWebhookDialog = (props: SendWebhookDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [selectedEndpoint, setSelectedEndpoint] = useState<SelectItem | null>(
    null
  );
  const { endpoints, isLoading: endpointsLoading } = useEndpoints();

  const enabledEndpoints = endpoints.filter((e) => e.enabled);
  const hasNoEndpoints = !endpointsLoading && enabledEndpoints.length === 0;

  const getPlaceholderLabel = () => {
    if (endpointsLoading) {
      return "Loading...";
    }
    if (hasNoEndpoints) {
      return "No endpoints available";
    }
    return "Select an endpoint";
  };

  const placeholderItem = { label: getPlaceholderLabel(), value: null };
  const items: SelectItem[] = [
    placeholderItem,
    ...enabledEndpoints.map((e) => ({ label: e.url, value: e.id })),
  ];

  const validateJson = (value: string): boolean => {
    if (!value.trim()) {
      setJsonError("Payload is required");
      return false;
    }
    try {
      JSON.parse(value);
      setJsonError(null);
      return true;
    } catch {
      setJsonError("Invalid JSON");
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const eventType = formData.get("eventType") as string;
    const payloadJson = formData.get("payload") as string;

    if (!selectedEndpoint?.value) {
      return;
    }

    if (!validateJson(payloadJson)) {
      return;
    }

    setLoading(true);

    const { error } = await api.webhooks.post(
      {
        eventType,
        payload: JSON.parse(payloadJson),
        endpointIds: [selectedEndpoint.value],
      },
      { fetch: { credentials: "include" } }
    );

    setLoading(false);

    if (error) {
      console.error("Error sending webhook:", error);
      return;
    }

    setOpen(false);
    setJsonError(null);
    setSelectedEndpoint(null);
    props.onSent();
  };

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger render={<Button disabled={props.disabled} />}>
        Send Test
      </DialogTrigger>
      <DialogPopup>
        <Form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Send Test Webhook</DialogTitle>
            <DialogDescription>
              Send a test webhook event to an endpoint.
            </DialogDescription>
          </DialogHeader>
          <DialogPanel className="space-y-4">
            <Field>
              <FieldLabel>Endpoint</FieldLabel>
              <Select
                aria-label="Select endpoint"
                disabled={endpointsLoading || hasNoEndpoints}
                items={items}
                onValueChange={setSelectedEndpoint}
                value={selectedEndpoint ?? placeholderItem}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectPopup alignItemWithTrigger={false}>
                  {items.map((item) => (
                    <SelectItemType key={item.value} value={item}>
                      {item.label}
                    </SelectItemType>
                  ))}
                </SelectPopup>
              </Select>
              <FieldDescription>
                {hasNoEndpoints
                  ? "Create an endpoint first to send test webhooks"
                  : "The endpoint to receive the test webhook"}
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel>Event Type</FieldLabel>
              <Input name="eventType" placeholder="order.created" required />
              <FieldDescription>The type of event being sent</FieldDescription>
            </Field>
            <Field>
              <FieldLabel>Payload</FieldLabel>
              <Textarea
                name="payload"
                onChange={(e) => validateJson(e.target.value)}
                placeholder='{"orderId": "123", "amount": 99.99}'
                required
              />
              {jsonError ? (
                <p className="text-destructive text-sm">{jsonError}</p>
              ) : null}
              <FieldDescription>
                JSON payload to send with the webhook
              </FieldDescription>
            </Field>
          </DialogPanel>
          <DialogFooter variant="bare">
            <DialogClose render={<Button type="button" variant="outline" />}>
              Cancel
            </DialogClose>
            <Button disabled={loading || !!jsonError} type="submit">
              {loading ? "Sending..." : "Send"}
            </Button>
          </DialogFooter>
        </Form>
      </DialogPopup>
    </Dialog>
  );
};
